const supabaseCli = require("../services/supabase.service");

// Helper robusto para leer invitados por fiesta, soportando distintos nombres/columnas
async function fetchGuestsByParty(partyId) {
  // Primero intentar con Invitados_Lista filtrando por party_id
  let { data, error } = await supabaseCli
    .from("Invitados_Lista")
    .select("id, name, validado, party_id")
    .eq("party_id", partyId)
    .order("id", { ascending: false });

  if (error) {
    console.error("Invitados_Lista query error:", error);
  }

  // Si falla por tabla/columna, intentar con Invitados_Fiesta
  const isMissingTableOrColumn = (err) => !!err && (
    String(err?.message || "").toLowerCase().includes("could not find") ||
    String(err?.message || "").toLowerCase().includes("schema cache") ||
    String(err?.message || "").toLowerCase().includes("relation") ||
    String(err?.message || "").toLowerCase().includes("column")
  );

  if (error && isMissingTableOrColumn(error)) {
    ({ data, error } = await supabaseCli
      .from("Invitados_Fiesta")
      .select("id, name, validado, party_id")
      .eq("party_id", partyId)
      .order("id", { ascending: false }));
  }

  // Si aún falla por columna party_id, caer sin filtro (por compatibilidad)
  if (error && String(error?.message || "").toLowerCase().includes("column") && String(error?.message || "").toLowerCase().includes("party_id")) {
    ({ data, error } = await supabaseCli
      .from("Invitados_Lista")
      .select("id, name, validado, party_id")
      .order("id", { ascending: false }));
  }

  return { data, error };
}

// GET /parties/:id/guests
async function getPartyGuests(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await fetchGuestsByParty(id);

    if (error) {
      console.error("Supabase Invitados error:", error);
      return res.status(500).json({ error: error.message });
    }

    const guests = (Array.isArray(data) ? data : []).map(g => {
      const flag = typeof g.validado !== 'undefined' ? g.validado : g.valid;
      return {
        id: g.id,
        name: g.name,
        status: flag === true ? "Valid" : (flag === false ? "Invalid" : "Pending"),
        avatar: null,
        time: null,
      };
    });

    return res.json(guests);
  } catch (err) {
    console.error("getPartyGuests unexpected error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

// GET /parties/:id/guests/summary
async function getGuestsSummary(req, res) {
  try {
    const { id } = req.params;

    // Obtener nombre de la fiesta
    let partyTitle = null;
    try {
      const { data: party, error: partyErr } = await supabaseCli
        .from("parties")
        .select("id, title")
        .eq("id", id)
        .single();
      if (!partyErr && party) partyTitle = party.title || null;
    } catch (e) {
      console.warn("No se pudo leer party title:", e?.message);
    }

    const { data, error } = await fetchGuestsByParty(id);

    if (error) {
      console.error("Supabase Invitados error:", error);
      return res.status(500).json({ error: error.message });
    }

    const all = Array.isArray(data) ? data : [];
    const flagOf = (g) => (typeof g.validado !== 'undefined' ? g.validado : g.valid);
    const pending = all.filter(g => flagOf(g) === null || typeof flagOf(g) === 'undefined');
    const validated = all.filter(g => flagOf(g) === true);
    const denied = all.filter(g => flagOf(g) === false);

    // Fallback: if no invitados tables or no pending, derive pending from Codes.already_used
    let codesPending = [];
    try {
      const { data: usedCodes, error: usedErr } = await supabaseCli
        .from('Codes')
        .select('code, user_id')
        .eq('party_id', id)
        .eq('already_used', true);
      if (!usedErr && Array.isArray(usedCodes) && usedCodes.length > 0) {
        const userIds = usedCodes.map(c => c.user_id).filter(u => !!u);
        let usersById = {};
        if (userIds.length) {
          const { data: usersList, error: usersErr } = await supabaseCli
            .from('users')
            .select('id, name')
            .in('id', userIds);
          if (!usersErr && Array.isArray(usersList)) {
            usersList.forEach(u => { usersById[String(u.id)] = u.name || 'Guest'; });
          }
        }
        codesPending = usedCodes.map(c => ({ id: c.code, name: usersById[String(c.user_id)] || 'Guest' }));
      }
    } catch (cpErr) {
      console.warn('Codes-based pending derivation failed:', cpErr?.message);
    }

    const lower = s => String(s || '').toLowerCase();
    const namesPending = new Set((pending || []).map(p => lower(p.name)));
    const namesValidated = new Set((validated || []).map(v => lower(v.name)));
    const namesDenied = new Set((denied || []).map(d => lower(d.name)));
    const filteredCodesPending = (codesPending || []).filter(cp => {
      const n = lower(cp.name);
      return !namesPending.has(n) && !namesValidated.has(n) && !namesDenied.has(n);
    });
    const pendingList = [
      ...pending.map(g => ({ id: g.id, name: g.name })),
      ...filteredCodesPending
    ];

    return res.json({
      party: { id, title: partyTitle },
      totals: {
        total: all.length,
        pending: pendingList.length,
        validated: validated.length,
        denied: denied.length,
      },
      lists: {
        pending: pendingList,
        validated: validated.map(g => ({ id: g.id, name: g.name })),
        denied: denied.map(g => ({ id: g.id, name: g.name })),
      },
    });
  } catch (err) {
    console.error("getGuestsSummary unexpected error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

// PATCH /parties/:id/guests/:guestId/status
async function updateGuestStatus(req, res) {
  try {
    const { id: partyId, guestId } = req.params;
    const { status, validado } = req.body || {};

    // Normalizar estado a booleano
    let newStatus;
    if (typeof validado === 'boolean') {
      newStatus = validado;
    } else if (typeof status === 'string') {
      const s = status.toLowerCase();
      newStatus = s === 'validated' || s === 'valid' || s === 'approve' || s === 'approved';
      if (s === 'denied' || s === 'invalid' || s === 'reject' || s === 'rejected') {
        newStatus = false;
      }
    }

    if (typeof newStatus === 'undefined') {
      return res.status(400).json({ error: "Missing status/validado in request" });
    }

    // Intentar actualizar en Invitados_Lista primero
    let { data, error } = await supabaseCli
      .from("Invitados_Lista")
      .update({ validado: newStatus })
      .eq("id", guestId)
      .eq("party_id", partyId)
      .select("id, name, validado, party_id")
      .single();

    const isMissingTableOrColumn = (err) => !!err && (
      String(err?.message || "").toLowerCase().includes("could not find") ||
      String(err?.message || "").toLowerCase().includes("schema cache") ||
      String(err?.message || "").toLowerCase().includes("relation") ||
      String(err?.message || "").toLowerCase().includes("column")
    );

    if (error && isMissingTableOrColumn(error)) {
      ({ data, error } = await supabaseCli
        .from("Invitados_Fiesta")
        .update({ validado: newStatus })
        .eq("id", guestId)
        .eq("party_id", partyId)
        .select("id, name, validado, party_id")
        .single());
    }

    if (error) {
      console.error("Error updating guest status:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, guest: data });
  } catch (err) {
    console.error("updateGuestStatus unexpected error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

module.exports = { getPartyGuests, getGuestsSummary, updateGuestStatus };