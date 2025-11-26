const supabaseCli = require("../services/supabase.service");
const { geocodeAddress } = require("../services/mapsAPI.js");

// Mock data for demonstration
const mockParties = [
  {
    id: 1,
    title: "Chicago Night",
    attendees: "23/96",
    location: "Calle 23#32-26",
    date: "5/9/21 • 23:00-06:00",
    administrator: "Loco Foroko",
    price: "$65.000",
    image: "https://images.unsplash.com/photo-1571266028243-d220b6b0b8c5?w=400&h=200&fit=crop",
    tags: ["Elegant", "Cocktailing"],
    liked: true,
    category: "hot-topic"
  },
  {
    id: 2,
    title: "Summer Vibes",
    attendees: "45/100",
    location: "Calle 15#45-12",
    date: "12/9/21 • 20:00-04:00",
    administrator: "DJ Summer",
    price: "$45.000",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=200&fit=crop",
    tags: ["Summer", "Outdoor"],
    liked: false,
    category: "hot-topic"
  },
  {
    id: 3,
    title: "Pre-New Year Pa...",
    attendees: "67/150",
    location: "Cra 51#39-26",
    date: "22/11/21 • 21:30-05:00",
    administrator: "DJ KC",
    price: "$80.000",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=150&fit=crop",
    tags: ["Disco Music", "Elegant"],
    liked: false,
    category: "upcoming"
  },
  {
    id: 4,
    title: "Neon Dreams",
    attendees: "89/120",
    location: "Calle 80#12-45",
    date: "15/9/21 • 22:00-05:00",
    administrator: "Neon DJ",
    price: "$55.000",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=150&fit=crop",
    tags: ["Electronic", "Neon"],
    liked: true,
    category: "upcoming"
  }
];

// Helper: attach prices array to parties and compute a display price
async function attachPricesToParties(parties) {
  try {
    const ids = parties.map(p => p.id).filter(Boolean);
    if (!ids.length) return parties;

    const { data: pricesData, error: pricesError } = await supabaseCli
      .from("prices")
      .select("*")
      .in("party_id", ids);

    if (pricesError) {
      console.error("Prices fetch error:", pricesError);
      return parties;
    }

    const byParty = new Map();
    pricesData.forEach(pr => {
      const arr = byParty.get(pr.party_id) || [];
      arr.push(pr);
      byParty.set(pr.party_id, arr);
    });

    return parties.map(party => {
      const prices = byParty.get(party.id) || [];
      // Compute a simple display price (first price or keep existing)
      const displayPrice = prices.length ? prices[0]?.price : party.price;
      return { ...party, prices, price: displayPrice };
    });
  } catch (e) {
    console.error("attachPricesToParties error:", e);
    return parties;
  }
}

const getHotTopicParties = async (req, res) => {
  try {
    // Get all parties from database
    const { data, error } = await supabaseCli
      .from("parties")
      .select("*");

    if (error) {
      console.error("Database error:", error);
      // Fallback to mock data - sort by attendees
      const hotTopicParties = mockParties
        .map(party => {
          const { current } = parseAttendees(party.attendees || "0/0");
          return { ...party, attendees_count: current };
        })
        .sort((a, b) => b.attendees_count - a.attendees_count)
        .slice(0, 5); // Only return top 5 most attended parties
      return res.json(hotTopicParties);
    }

    if (data && data.length > 0) {
      const enriched = await attachPricesToParties(data);
      // Add numeric attendee fields and sort by attendees count (descending)
      const withCounts = enriched
        .map(party => {
          const { current, max } = parseAttendees(party.attendees || "0/0");
          return {
            ...party,
            attendees_count: current,
            max_attendees: max || 100
          };
        })
        .sort((a, b) => b.attendees_count - a.attendees_count)
        .slice(0, 5); // Only return top 5 most attended parties
      return res.json(withCounts);
    }

    // If no data in database, return mock data sorted by attendees
    const hotTopicParties = mockParties
      .map(party => {
        const { current } = parseAttendees(party.attendees || "0/0");
        return { ...party, attendees_count: current };
      })
      .sort((a, b) => b.attendees_count - a.attendees_count)
      .slice(0, 5); // Only return top 5 most attended parties
    res.json(hotTopicParties);
  } catch (error) {
    console.error("Error fetching hot topic parties:", error);
    // Fallback to mock data sorted by attendees
    const hotTopicParties = mockParties
      .map(party => {
        const { current } = parseAttendees(party.attendees || "0/0");
        return { ...party, attendees_count: current };
      })
      .sort((a, b) => b.attendees_count - a.attendees_count);
    res.json(hotTopicParties);
  }
};

const getUpcomingParties = async (req, res) => {
  try {
    // Try to get from database first
    const { data, error } = await supabaseCli
      .from("parties")
      .select("*")
      .eq("category", "upcoming")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      // Fallback to mock data
      const upcomingParties = mockParties.filter(party => party.category === "upcoming");
      return res.json(upcomingParties);
    }

    if (data && data.length > 0) {
      const enriched = await attachPricesToParties(data);
      // add numeric attendee fields for client rendering
      const withCounts = enriched.map(party => {
        const { current, max } = parseAttendees(party.attendees || "0/0");
        return {
          ...party,
          attendees_count: current,
          max_attendees: max || 100
        };
      });
      return res.json(withCounts);
    }

    // If no data in database, return mock data
    const upcomingParties = mockParties.filter(party => party.category === "upcoming");
    res.json(upcomingParties);
  } catch (error) {
    console.error("Error fetching upcoming parties:", error);
    // Fallback to mock data
    const upcomingParties = mockParties.filter(party => party.category === "upcoming");
    res.json(upcomingParties);
  }
};

const getAllParties = async (req, res) => {
  try {
    // Try to get from database first
    const { data, error } = await supabaseCli
      .from("parties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      // Fallback to mock data
      return res.json(mockParties);
    }

    if (data && data.length > 0) {
      const enriched = await attachPricesToParties(data);
      return res.json(enriched);
    }

    // If no data in database, return mock data
    res.json(mockParties);
  } catch (error) {
    console.error("Error fetching all parties:", error);
    // Fallback to mock data
    res.json(mockParties);
  }
};

const searchParties = async (req, res) => {
  try {
    const { q = "", tags = "", category = "" } = req.query || {};

    // Normalize filters
    const tagList = String(tags)
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Try DB first
    let queryBuilder = supabaseCli.from("parties").select("*");

    if (q) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${q}%,administrator.ilike.%${q}%,location.ilike.%${q}%`
      );
    }
    if (category) {
      queryBuilder = queryBuilder.eq("category", category);
    }
    if (tagList.length) {
      // tags is an array column in DB; use contains operator
      queryBuilder = queryBuilder.contains("tags", tagList);
    }

    queryBuilder = queryBuilder.order("created_at", { ascending: false });

    const { data, error } = await queryBuilder;

    if (error) {
      console.error("Database error:", error);
    } else if (data && data.length > 0) {
      return res.json(data);
    }

    // Fallback to mock search
    const qLower = String(q).toLowerCase();
    const filteredParties = mockParties.filter((party) => {
      const matchesText = !qLower ||
        party.title.toLowerCase().includes(qLower) ||
        party.administrator.toLowerCase().includes(qLower) ||
        party.location.toLowerCase().includes(qLower);
      const matchesCategory = !category || party.category === category;
      const matchesTags = !tagList.length || tagList.every((t) => party.tags?.includes(t));
      return matchesText && matchesCategory && matchesTags;
    });
    return res.json(filteredParties);
  } catch (error) {
    console.error("Error searching parties:", error);
    // Safe fallback: return mock filtered by any provided query
    const { q = "", tags = "", category = "" } = req.query || {};
    const tagList = String(tags)
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const qLower = String(q).toLowerCase();
    const filteredParties = mockParties.filter((party) => {
      const matchesText = !qLower ||
        party.title.toLowerCase().includes(qLower) ||
        party.administrator.toLowerCase().includes(qLower) ||
        party.location.toLowerCase().includes(qLower);
      const matchesCategory = !category || party.category === category;
      const matchesTags = !tagList.length || tagList.every((t) => party.tags?.includes(t));
      return matchesText && matchesCategory && matchesTags;
    });
    return res.json(filteredParties);
  }
};

const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const { liked } = req.body;

    // Try to update in database first
    const { data, error } = await supabaseCli
      .from("parties")
      .update({ liked })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Database error:", error);
      // For mock data, just return success
      return res.json({ success: true, liked });
    }

    res.json({ success: true, liked, data });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.json({ success: true, liked: req.body.liked });
  }
};

const getEventDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get from database first
    const { data, error } = await supabaseCli
      .from("parties")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Database error:", error);
      // Fallback to mock data
      const eventDetails = getMockEventDetails(id);
      return res.json({ success: true, party: eventDetails });
    }

    if (data) {
      // Fetch prices for this party
      const { data: prices, error: pricesErr } = await supabaseCli
        .from("prices")
        .select("*")
        .eq("party_id", data.id);
      if (pricesErr) {
        console.error("Error fetching event prices:", pricesErr);
      }

      // Fetch administrator info from users table
      let administratorImage = null;
      try {
        const { data: adminUser, error: adminError } = await supabaseCli
          .from("users")
          .select("profile_image")
          .eq("name", data.administrator)
          .single();
        
        if (adminError) {
          console.warn("Error fetching administrator info:", adminError);
        } else {
          const rawImg = adminUser?.profile_image;
          const SUPA_URL = process.env.SUPABASE_URL || "";
          const isHttp = typeof rawImg === 'string' && /^https?:\/\//i.test(rawImg);
          const isDataUrl = typeof rawImg === 'string' && /^data:/i.test(rawImg);
          const isBlobUrl = typeof rawImg === 'string' && /^blob:/i.test(rawImg);
          const hasStoragePrefix = typeof rawImg === 'string' && rawImg.includes('/storage/v1/object/public/');
          if (isHttp) {
            administratorImage = rawImg;
          } else if (isDataUrl || isBlobUrl) {
            // Already a valid data/blob URL, use as-is
            administratorImage = rawImg;
          } else if (hasStoragePrefix && SUPA_URL) {
            // Raw path already includes storage public prefix; make absolute with SUPABASE_URL
            const needsSlash = rawImg.startsWith('/') ? '' : '/';
            administratorImage = `${SUPA_URL}${needsSlash}${rawImg}`;
          } else if (typeof rawImg === 'string' && rawImg.length > 0 && SUPA_URL) {
            // Assume rawImg is bucket/object path (e.g., "avatars/admin.jpg"). Build proper public URL.
            const cleanPath = rawImg.replace(/^\/+/, '');
            administratorImage = `${SUPA_URL}/storage/v1/object/public/${cleanPath}`;
          } else {
            // Robust fallback avatar generated from administrator name
            const name = encodeURIComponent(data.administrator || 'Organizer');
            administratorImage = `https://ui-avatars.com/api/?name=${name}&background=5636D3&color=ffffff&size=150`; 
          }
          console.log("[getEventDetails] Administrator image resolved:", administratorImage);
        }
      } catch (adminCatch) {
        console.warn("Administrator query failed:", adminCatch);
        const name = encodeURIComponent(data.administrator || 'Organizer');
        administratorImage = `https://ui-avatars.com/api/?name=${name}&background=5636D3&color=ffffff&size=150`;
      }

      // Fetch description for this party (single row optional)
      let descriptionText = "";
      try {
        const { data: descRow, error: descErr } = await supabaseCli
          .from("descriptions")
          .select("description")
          .eq("party_id", data.id)
          .single();
        if (descErr) {
          console.warn("Description fetch error:", descErr);
        } else {
          descriptionText = descRow?.description || "";
        }
      } catch (descCatch) {
        console.warn("Description query failed:", descCatch);
      }

      // Compute capacity from attendees (max part of "current/max")
      const parseCapacity = (attStr = "0/0") => {
        try {
          const [curStr, maxStr] = String(attStr).split("/");
          const max = parseInt(maxStr, 10) || 0;
          return max;
        } catch {
          return 0;
        }
      };
      const capacityMax = parseCapacity(data.attendees || "0/0");

      // Count reserved codes (already_used = true) for this party
      let reservedCount = 0;
      try {
        const { count, error: codesErr } = await supabaseCli
          .from("Codes")
          .select("id", { count: "exact", head: true })
          .eq("party_id", data.id)
          .eq("already_used", true);
        if (codesErr) {
          console.warn("Codes count error:", codesErr);
        } else {
          reservedCount = count || 0;
        }
      } catch (cErr) {
        console.warn("Codes count failed:", cErr);
      }

      const displayPrice = (prices && prices.length) ? prices[0]?.price : data.price;
      const parsed = parseDateAndHour(data.date);
      console.log("[getEventDetails] id:", data.id, "date:", data.date, "parsed:", parsed);
      return res.json({ 
        success: true, 
        party: { 
          ...data, 
          prices: prices || [], 
          price: displayPrice, 
          description: descriptionText, 
          date_iso: parsed.iso, 
          hour_24: parsed.hour,
          administrator_image: administratorImage,
          capacity: capacityMax,
          reserved_count: reservedCount
        } 
      });
    }

    // If no data in database, return mock data
    const eventDetails = getMockEventDetails(id);
    res.json({ success: true, party: eventDetails });
  } catch (error) {
    console.error("Error fetching event details:", error);
    // Fallback to mock data
    const eventDetails = getMockEventDetails(req.params.id);
    res.json({ success: true, party: eventDetails });
  }
};

function getMockEventDetails(eventId) {
  const party = mockParties.find(p => String(p.id) === String(eventId));
  if (!party) return null;
  return {
    ...party,
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum.",
    contact: {
      name: party.administrator,
      phone: "+57 300 123 4567"
    }
  };
}

// Helpers for automatic category assignment
function parseAttendees(attStr = "0/0") {
  try {
    const [curStr, maxStr] = String(attStr).split("/");
    const current = parseInt(curStr, 10) || 0;
    const max = parseInt(maxStr, 10) || 0;
    return { current, max };
  } catch {
    return { current: 0, max: 0 };
  }
}

function daysUntil(isoDate) {
  try {
    const target = new Date(isoDate);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((target.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / msPerDay);
  } catch {
    return null;
  }
}

function parseDateAndHour(raw) {
  try {
    if (!raw) return { iso: null, hour: null };
    const s = String(raw);
    let iso = null;
    let hour = null;
    // dd/mm/yy or dd/mm/yyyy
    const m1 = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m1) {
      const d = m1[1].padStart(2, '0');
      const m = m1[2].padStart(2, '0');
      let y = m1[3];
      if (y.length === 2) y = `20${y}`;
      iso = `${y}-${m}-${d}`;
    }
    // yyyy-mm-dd
    if (!iso) {
      const m2 = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m2) {
        const y = m2[1];
        const m = m2[2].padStart(2, '0');
        const d = m2[3].padStart(2, '0');
        iso = `${y}-${m}-${d}`;
      }
    }
    // time HH:mm or h:mm K
    const t = s.match(/(\d{1,2}:\d{2})/);
    if (t) {
      const [h, mm] = t[1].split(':');
      const hh = String(h).padStart(2, '0');
      hour = `${hh}:${mm}`;
    }
    return { iso, hour };
  } catch {
    return { iso: null, hour: null };
  }
}

function formatDisplayDate(isoDate, hour) {
  try {
    const dt = new Date(isoDate);
    if (isNaN(dt.getTime())) return `${isoDate}${hour ? ` • ${hour}` : ""}`;
    const d = dt.getDate();
    const m = dt.getMonth() + 1;
    const y = String(dt.getFullYear()).slice(2);
    return `${d}/${m}/${y}${hour ? ` • ${hour}` : ""}`;
  } catch {
    return `${isoDate}${hour ? ` • ${hour}` : ""}`;
  }
}

function computeCategoryAuto(attendees, isoDate) {
  const { current, max } = parseAttendees(attendees);
  const percent = max > 0 ? current / max : 0;
  const days = daysUntil(isoDate);
  const HOT_PERCENT = 0.6; // 60% ocupación
  const UPCOMING_DAYS = 7; // Próximos 7 días
  if (percent >= HOT_PERCENT) return "hot-topic";
  if (days !== null && days >= 0 && days <= UPCOMING_DAYS) return "upcoming";
  // Por defecto, si es un evento futuro, lo tratamos como upcoming
  if (days !== null && days >= 0) return "upcoming";
  // Si la fecha ya pasó y no es hot, marcamos como hot-topic para no dejar sin categoría
  return "hot-topic";
}
const createParty = async (req, res) => {
  try {
    console.log("[createParty] Incoming body:", req.body);
    const {
      title,
      attendees,
      location,
      date,      // esperado como yyyy-mm-dd
      hour,      // HH:mm
      administrator,
      number,    // contacto telefónico
      image,
      tags,
      prices, // Array de { price_name, price }
      description, // Texto opcional para tabla descriptions
    } = req.body || {};

    if (!title || !location || !date || !administrator) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // For now, skip authentication check if Supabase is not available
    console.log("[createParty] Skipping authentication for testing");

    const safeAttendees = attendees || "0/0";
    // Geocode: resolve user-entered location to formatted address
    let resolvedLocation = location;
    try {
      console.log("[createParty] Geocoding address via Nominatim:", location);
      const geo = await geocodeAddress(location);
      if (geo.ok && geo.formatted) {
          resolvedLocation = geo.formatted;
        }
      } catch { }
      const category = computeCategoryAuto(safeAttendees, date);
      const displayDate = formatDisplayDate(date, hour);

      // Normalizar campos
      const payload = {
        title,
        attendees: safeAttendees,
        location: resolvedLocation,
        date: displayDate,
        administrator,
        image: image || "",
        number: number ? String(number).replace(/\D+/g, "") : null,
        tags: Array.isArray(tags) ? tags : [],
        category,
      };
      console.log("[createParty] Insert payload:", payload);

      // Create party in database
      const result = await supabaseCli
        .from("parties")
        .insert([payload])
        .select();
      
      if (result.error) {
        console.error("Database insert error:", result.error);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to create party in database", 
          error: result.error 
        });
      }

      const created = result.data;

      const party = created?.[0];

      // If description provided, insert into descriptions table
      let descriptionRecord = null;
      let descriptionInsertError = null;
      if (party?.id && description && String(description).trim().length) {
        const { data: descData, error: descErr } = await supabaseCli
          .from("descriptions")
          .insert([{ party_id: Number(party.id), description: String(description).trim() }])
          .select();
        if (descErr) {
          console.error("Description insert error:", descErr);
          descriptionInsertError = descErr;
        } else {
          descriptionRecord = descData?.[0] || null;
        }
      }

      // Insert prices if provided
      let insertedPrices = [];
      let pricesInsertError = null;
      if (Array.isArray(prices) && prices.length && party?.id) {
        const normalizedPrices = prices
          .filter(p => (p?.price_name || p?.name) && p?.price)
          .map(p => ({
            price_name: String(p.price_name || p.name).trim(),
            price: String(p.price).trim(),
            party_id: Number(party.id),
          }));

        if (normalizedPrices.length) {
          const { data: prData, error: prErr } = await supabaseCli
            .from("prices")
            .insert(normalizedPrices)
            .select();
          if (prErr) {
            console.error("Prices insert error:", prErr);
            pricesInsertError = prErr;
          } else {
            insertedPrices = prData || [];
          }
        }
      }

      const displayPrice = insertedPrices.length ? insertedPrices[0]?.price : party?.price;
      if (pricesInsertError || descriptionInsertError) {
        return res.status(201).json({
          success: true,
          party: { ...party, prices: insertedPrices, price: displayPrice },
          prices_error: pricesInsertError?.message || pricesInsertError,
          description_error: descriptionInsertError?.message || descriptionInsertError,
          description_record: descriptionRecord,
        });
      }
      return res.status(201).json({ success: true, party: { ...party, prices: insertedPrices, price: displayPrice }, description_record: descriptionRecord });
    } catch (error) {
      console.error("Error creating party:", error);
      return res.status(500).json({ success: false, message: "Unexpected error" });
    }
  };

const updateParty = async (req, res) => {
  try {
    const { id } = req.params;
    const partyId = Number(id);
    if (!partyId || Number.isNaN(partyId)) {
      return res.status(400).json({ success: false, message: "Invalid party id" });
    }

    const {
      title,
      attendees,
      location,
      date,
      hour,
      administrator,
      number,
      image,
      tags,
      prices,
      description,
    } = req.body || {};

    const safeAttendees = attendees || "0/0";
    let resolvedLocation = location;
    try {
      if (location) {
        const geo = await geocodeAddress(location);
        if (geo.ok && geo.formatted) {
          resolvedLocation = geo.formatted;
        }
      }
    } catch {}

    const category = date ? computeCategoryAuto(safeAttendees, date) : undefined;
    const displayDate = date ? formatDisplayDate(date, hour) : undefined;

    const payload = {};
    if (title !== undefined) payload.title = title;
    if (safeAttendees !== undefined) payload.attendees = safeAttendees;
    if (resolvedLocation !== undefined) payload.location = resolvedLocation;
    if (displayDate !== undefined) payload.date = displayDate;
    // Si administrator es email, buscar el nombre actual por email
    if (administrator !== undefined) {
      // Buscar usuario por email si parece email
      if (administrator.includes('@')) {
        const { data: user, error: userErr } = await supabaseCli
          .from('users')
          .select('name')
          .eq('email', administrator.toLowerCase().trim())
          .single();
        if (!userErr && user && user.name) {
          payload.administrator = user.name;
        } else {
          payload.administrator = administrator; // fallback
        }
      } else {
        payload.administrator = administrator;
      }
    }
    if (number !== undefined) payload.number = number ? String(number).replace(/\D+/g, "") : null;
    if (image !== undefined) payload.image = image;
    if (tags !== undefined) payload.tags = Array.isArray(tags) ? tags : [];
    if (category !== undefined) payload.category = category;

    const { data: updatedRows, error: upErr } = await supabaseCli
      .from("parties")
      .update(payload)
      .eq("id", partyId)
      .select();

    if (upErr) {
      console.error("Database update error:", upErr);
      return res.status(500).json({ success: false, message: "Failed to update party in database", error: upErr });
    }

    const party = updatedRows?.[0];

    // Handle description update/insert/delete
    let descriptionRecord = null;
    let descriptionError = null;
    try {
      if (description !== undefined) {
        const descText = String(description || "").trim();
        const { data: existingDesc, error: existErr } = await supabaseCli
          .from("descriptions")
          .select("id")
          .eq("party_id", partyId);
        if (existErr) {
          descriptionError = existErr;
        } else {
          const hasExisting = Array.isArray(existingDesc) && existingDesc.length > 0;
          if (hasExisting && descText.length) {
            const { data: updDesc, error: updErr } = await supabaseCli
              .from("descriptions")
              .update({ description: descText })
              .eq("party_id", partyId)
              .select();
            if (updErr) descriptionError = updErr; else descriptionRecord = updDesc?.[0] || null;
          } else if (!hasExisting && descText.length) {
            const { data: insDesc, error: insErr } = await supabaseCli
              .from("descriptions")
              .insert([{ party_id: partyId, description: descText }])
              .select();
            if (insErr) descriptionError = insErr; else descriptionRecord = insDesc?.[0] || null;
          } else if (hasExisting && !descText.length) {
            try { await supabaseCli.from("descriptions").delete().eq("party_id", partyId); } catch (delErr) { console.warn("Description delete error:", delErr); }
          }
        }
      }
    } catch (descCatch) {
      descriptionError = descCatch;
    }

    // Replace prices if provided
    let insertedPrices = [];
    let pricesInsertError = null;
    try {
      if (Array.isArray(prices)) {
        try { await supabaseCli.from("prices").delete().eq("party_id", partyId); } catch (delErr) { console.warn("Prices delete error:", delErr); }
        const normalizedPrices = prices
          .filter(p => (p?.price_name || p?.name) && p?.price)
          .map(p => ({
            price_name: String(p.price_name || p.name).trim(),
            price: String(p.price).trim(),
            party_id: partyId,
          }));
        if (normalizedPrices.length) {
          const { data: prData, error: prErr } = await supabaseCli
            .from("prices")
            .insert(normalizedPrices)
            .select();
          if (prErr) {
            pricesInsertError = prErr;
          } else {
            insertedPrices = prData || [];
          }
        }
      }
    } catch (prCatch) {
      pricesInsertError = prCatch;
    }

    const displayPriceFinal = insertedPrices.length ? insertedPrices[0]?.price : party?.price;

    if (pricesInsertError || descriptionError) {
      return res.status(200).json({
        success: true,
        party: { ...party, prices: insertedPrices, price: displayPriceFinal },
        prices_error: pricesInsertError?.message || pricesInsertError,
        description_error: descriptionError?.message || descriptionError,
        description_record: descriptionRecord,
      });
    }

    return res.status(200).json({ success: true, party: { ...party, prices: insertedPrices, price: displayPriceFinal }, description_record: descriptionRecord });
  } catch (error) {
    console.error("Error updating party:", error);
    return res.status(500).json({ success: false, message: "Unexpected error" });
  }
};

const getAdminStatistics = async (req, res) => {
  try {
    // Get total events count
    const { count: totalEvents, error: eventsError } = await supabaseCli
      .from("parties")
      .select("*", { count: "exact", head: true });

    if (eventsError) {
      console.error("Error fetching total events:", eventsError);
      return res.status(500).json({ success: false, message: "Error fetching statistics" });
    }

    // Get active users count
    const { count: activeUsers, error: usersError } = await supabaseCli
      .from("users")
      .select("*", { count: "exact", head: true });

    if (usersError) {
      console.error("Error fetching active users:", usersError);
      return res.status(500).json({ success: false, message: "Error fetching statistics" });
    }

    // Get pending approvals (events that need approval - for now, we'll use upcoming events as pending)
    const { count: pendingApprovals, error: pendingError } = await supabaseCli
      .from("parties")
      .select("*", { count: "exact", head: true })
      .eq("category", "upcoming");

    if (pendingError) {
      console.error("Error fetching pending approvals:", pendingError);
      return res.status(500).json({ success: false, message: "Error fetching statistics" });
    }

    // Calculate revenue (sum of all prices - this is a simplified calculation)
    const { data: pricesData, error: pricesError } = await supabaseCli
      .from("prices")
      .select("price");

    let revenue = 0;
    if (!pricesError && pricesData) {
      // Extract numeric values from price strings and sum them
      revenue = pricesData.reduce((sum, priceObj) => {
        const priceStr = priceObj.price.replace(/[^0-9]/g, ''); // Remove non-numeric characters
        const priceNum = parseInt(priceStr, 10) || 0;
        return sum + priceNum;
      }, 0);
    }

    // Format revenue as currency
    const formattedRevenue = `$${revenue.toLocaleString()}`;

    const statistics = {
      totalEvents: totalEvents || 0,
      activeUsers: activeUsers || 0,
      pendingApprovals: pendingApprovals || 0,
      revenue: formattedRevenue
    };

    res.json({ success: true, statistics });
  } catch (error) {
    console.error("Error fetching admin statistics:", error);
    res.status(500).json({ success: false, message: "Error fetching statistics" });
  }
};

const getAdminParties = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log("[getAdminParties] Request body:", req.body);
    console.log("[getAdminParties] Email from request:", email);
    
    if (!email) {
      console.log("[getAdminParties] No email provided");
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // First, get the admin user to find their name
    console.log("[getAdminParties] Looking up admin user by email:", email);
    const { data: adminUser, error: userError } = await supabaseCli
      .from("users")
      .select("id, name, email, is_admin")
      .eq("email", email.toLowerCase().trim())
      .single();

    console.log("[getAdminParties] Admin user lookup result:", { adminUser, userError });

    if (userError || !adminUser) {
      console.log("[getAdminParties] Admin user not found:", userError);
      return res.status(401).json({ success: false, message: "Admin user not found" });
    }

    if (!adminUser.is_admin) {
      console.log("[getAdminParties] User is not admin:", adminUser);
      return res.status(403).json({ success: false, message: "Access denied. Administrator privileges required." });
    }

    // Get parties created by this admin using their NAME as administrator
    console.log("[getAdminParties] Querying parties for administrator name:", adminUser.name);
    console.log("[getAdminParties] Admin user details:", {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      is_admin: adminUser.is_admin
    });
    
    const { data: parties, error } = await supabaseCli
      .from("parties")
      .select("*")
      .eq("administrator", adminUser.name)
      .order("created_at", { ascending: false });

    console.log("[getAdminParties] Supabase query result:", { parties, error });
    console.log("[getAdminParties] Query used: administrator =", adminUser.name);

    if (error) {
      console.error("Error fetching admin parties:", error);
      return res.status(500).json({ success: false, message: "Error fetching parties" });
    }

    console.log("[getAdminParties] Found parties:", parties?.length || 0);

    // Add status based on category and other factors
    const partiesWithStatus = parties.map(party => ({
      ...party,
      status: (party.category === 'hot-topic' || party.category === 'upcoming') ? 'active' : 'inactive'
    }));

    console.log("[getAdminParties] Returning parties with status:", partiesWithStatus.length);
    res.json({ success: true, parties: partiesWithStatus });
  } catch (error) {
    console.error("Error in getAdminParties:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAdminMetrics = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // First, get the admin user to find their name
    const { data: adminUser, error: userError } = await supabaseCli
      .from("users")
      .select("id, name, email, is_admin")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (userError || !adminUser) {
      return res.status(401).json({ success: false, message: "Admin user not found" });
    }

    if (!adminUser.is_admin) {
      return res.status(403).json({ success: false, message: "Access denied. Administrator privileges required." });
    }

    // Get parties created by this admin using their NAME as administrator
    const { data: parties, error } = await supabaseCli
      .from("parties")
      .select("attendees, prices(price)")
      .eq("administrator", adminUser.name);

    if (error) {
      console.error("Error fetching admin metrics:", error);
      return res.status(500).json({ success: false, message: "Error fetching metrics" });
    }

    // Calculate total attendees
    let totalAttendees = 0;
    parties.forEach(party => {
      const [current, max] = party.attendees.split('/').map(Number);
      totalAttendees += current || 0;
    });

    // Calculate total revenue
    let totalRevenue = 0;
    parties.forEach(party => {
      if (party.prices && party.prices.length > 0) {
        party.prices.forEach(price => {
          const priceStr = price.price.replace(/[^0-9]/g, '');
          const priceNum = parseInt(priceStr, 10) || 0;
          totalRevenue += priceNum;
        });
      }
    });

    const metrics = {
      totalAttendees: totalAttendees.toLocaleString(),
      totalRevenue: `$${totalRevenue.toLocaleString()}`
    };

    res.json({ success: true, metrics });
  } catch (error) {
    console.error("Error in getAdminMetrics:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete a party and related data (codes, storage image)
const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;
    const partyId = Number(id);
    if (!partyId || Number.isNaN(partyId)) {
      return res.status(400).json({ success: false, message: "Invalid party id" });
    }

    // Ensure party exists and capture image URL
    const { data: party, error: partyFetchErr } = await supabaseCli
      .from("parties")
      .select("id, image")
      .eq("id", partyId)
      .single();

    if (partyFetchErr) {
      console.error("Error finding party:", partyFetchErr);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    if (!party) {
      return res.status(404).json({ success: false, message: "Party not found" });
    }

    // Best effort: remove guests from Invitados_Lista
    try {
      const { error: guestsListErr } = await supabaseCli.from("Invitados_Lista").delete().eq("party_id", partyId);
      if (guestsListErr) console.warn("Invitados_Lista deletion error:", guestsListErr?.message || guestsListErr);
    } catch (guestsListErr) {
      console.warn("Invitados_Lista deletion failed or table missing:", guestsListErr?.message || guestsListErr);
    }

    // Best effort: remove guests from Invitados_Fiesta
    try {
      const { error: guestsFiestaErr } = await supabaseCli.from("Invitados_Fiesta").delete().eq("party_id", partyId);
      if (guestsFiestaErr) console.warn("Invitados_Fiesta deletion error:", guestsFiestaErr?.message || guestsFiestaErr);
    } catch (guestsFiestaErr) {
      console.warn("Invitados_Fiesta deletion failed or table missing:", guestsFiestaErr?.message || guestsFiestaErr);
    }

    // Best effort: remove QR codes
    try {
      const { error: qrErr } = await supabaseCli.from("qr_codes").delete().eq("party_id", partyId);
      if (qrErr) console.warn("QR codes deletion error:", qrErr?.message || qrErr);
    } catch (qrErr) {
      console.warn("QR codes deletion failed or table missing:", qrErr?.message || qrErr);
    }

    // Best effort: remove entry codes
    try {
      const { error: codesErr } = await supabaseCli.from("Codes").delete().eq("party_id", partyId);
      if (codesErr) console.warn("Codes deletion error:", codesErr?.message || codesErr);
    } catch (codesErr) {
      console.warn("Codes deletion failed or table missing:", codesErr?.message || codesErr);
    }

    // Best effort: remove prices
    try {
      const { error: pricesErr } = await supabaseCli.from("prices").delete().eq("party_id", partyId);
      if (pricesErr) console.warn("Prices deletion error:", pricesErr?.message || pricesErr);
    } catch (pricesErr) {
      console.warn("Prices deletion failed or table missing:", pricesErr?.message || pricesErr);
    }

    // Best effort: remove descriptions
    try {
      const { error: descErr } = await supabaseCli.from("descriptions").delete().eq("party_id", partyId);
      if (descErr) console.warn("Descriptions deletion error:", descErr?.message || descErr);
    } catch (descErr) {
      console.warn("Descriptions deletion failed or table missing:", descErr?.message || descErr);
    }

    // Best effort: delete cover image if stored in Supabase Storage
    try {
      const imageUrl = party.image;
      const publicPrefix = "/storage/v1/object/public/";
      if (imageUrl && typeof imageUrl === "string" && imageUrl.includes(publicPrefix)) {
        const path = imageUrl.split(publicPrefix)[1]; // e.g. "party-images/filename.jpg"
        const bucket = path?.split("/")[0];
        const objectPath = path?.substring(bucket.length + 1);
        if (bucket && objectPath) {
          const { error: removeErr } = await supabaseCli.storage.from(bucket).remove([objectPath]);
          if (removeErr) {
            console.warn("Storage remove error:", removeErr.message || removeErr);
          }
        }
      }
    } catch (imgErr) {
      console.warn("Image cleanup skipped:", imgErr?.message || imgErr);
    }

    // Delete party (explicit after dependents)
    console.log(`[deleteParty] Attempting to delete party ${partyId}`);
    const { data: deleted, error: delErr } = await supabaseCli
      .from("parties")
      .delete()
      .eq("id", partyId)
      .select();

    if (delErr) {
      console.error("Party deletion error:", delErr);
      console.error("Error details:", {
        code: delErr.code,
        message: delErr.message,
        details: delErr.details,
        hint: delErr.hint
      });
      return res.status(500).json({ 
        success: false, 
        message: "Failed to delete party", 
        error: delErr?.message || delErr,
        errorCode: delErr?.code
      });
    }

    console.log(`[deleteParty] Successfully deleted party ${partyId}`);
    return res.json({ success: true, party: deleted?.[0] || { id: partyId } });
  } catch (error) {
    console.error("Unexpected deleteParty error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: error.message
    });
  }
};

// Upload party image via backend using Supabase service role
const uploadPartyImage = async (req, res) => {
  try {
    const { dataUrl, fileName = `party_${Date.now()}.jpg`, contentType } = req.body || {};
    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ success: false, message: "dataUrl requerido" });
    }
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) {
      return res.status(400).json({ success: false, message: "Formato dataUrl inválido" });
    }
    const mime = contentType || match[1] || "image/jpeg";
    const base64 = match[2];
    const buffer = Buffer.from(base64, "base64");

    const bucket = "party-images";
    const sanitizedName = String(fileName).replace(/\s+/g, "_");
    const filePath = `parties/${Date.now()}_${sanitizedName}`;

    // Attempt upload, auto-create bucket if missing
    let uploadError = null;
    let uploaded = null;
    try {
      const upRes = await supabaseCli.storage
        .from(bucket)
        .upload(filePath, buffer, { upsert: true, contentType: mime });
      uploaded = upRes.data;
      uploadError = upRes.error || null;
    } catch (e) {
      uploadError = e;
    }

    if (uploadError) {
      const msg = uploadError?.message || String(uploadError);
      console.warn("Upload failed, trying to create bucket:", msg);
      // Try to create bucket (requires service role)
      try {
        await supabaseCli.storage.createBucket(bucket, { public: true });
        const retry = await supabaseCli.storage
          .from(bucket)
          .upload(filePath, buffer, { upsert: true, contentType: mime });
        uploaded = retry.data;
        uploadError = retry.error || null;
      } catch (createErr) {
        console.error("Bucket creation/upload retry failed:", createErr?.message || createErr);
        return res.status(500).json({ success: false, message: "Fallo al subir imagen", error: msg });
      }
    }

    const { data: pub } = await supabaseCli.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      return res.status(500).json({ success: false, message: "No se pudo obtener URL pública" });
    }

    return res.status(200).json({ success: true, publicUrl, path: filePath, bucket });
  } catch (err) {
    console.error("Unexpected uploadPartyImage error:", err);
    return res.status(500).json({ success: false, message: "Error interno al subir imagen" });
  }
};

// Get party description
const getPartyDescription = async (req, res) => {
  try {
    const { partyId } = req.params;
    
    console.log('[getPartyDescription] Getting description for party:', partyId);
    console.log('[getPartyDescription] Request params:', req.params);
    
    const { data: description, error } = await supabaseCli
      .from('descriptions')
      .select('*')
      .eq('party_id', partyId)
      .single();

    console.log('[getPartyDescription] Supabase response:', { description, error });

    if (error) {
      console.error('[getPartyDescription] Error fetching description:', error);
      return res.status(500).json({
        success: false,
        message: "Error fetching party description",
        error: error.message
      });
    }

    if (!description) {
      console.log('[getPartyDescription] No description found for party:', partyId);
      return res.status(404).json({
        success: false,
        message: "Description not found for this party"
      });
    }

    console.log('[getPartyDescription] Description found:', description);

    res.json({
      success: true,
      description: description.description,
      dress_code: description.dress_code || [],
      additional_info: description.additional_info || ""
    });

  } catch (error) {
    console.error('Error in getPartyDescription:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  getHotTopicParties,
  getUpcomingParties,
  getAllParties,
  searchParties,
  toggleLike,
  getEventDetails,
  /**
   * Update attendance for a party by simple actions: 'going', 'maybe', 'not-going'.
   * - going: increments current attendees up to max
   * - not-going: decrements current attendees down to 0
   * - maybe: no change (placeholder for future tracking)
   * Returns the updated counts in a consistent JSON shape expected by the frontend.
   */
  updateAttendance: async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body || {};

      if (!id) {
        return res.status(400).json({ success: false, message: "Missing party id" });
      }
      if (!action || !['going', 'maybe', 'not-going'].includes(action)) {
        return res.status(400).json({ success: false, message: "Invalid attendance action" });
      }

      // Fetch party to read and update attendees string
      const { data: party, error: fetchErr } = await supabaseCli
        .from('parties')
        .select('id, attendees')
        .eq('id', id)
        .single();

      if (fetchErr) {
        console.error('[updateAttendance] Party fetch error:', fetchErr);
        return res.status(500).json({ success: false, message: 'Failed to load party' });
      }
      if (!party) {
        return res.status(404).json({ success: false, message: 'Party not found' });
      }

      // Parse attendees like "current/max"
      const parse = (attStr = '0/0') => {
        try {
          const [curStr, maxStr] = String(attStr).split('/');
          const current = parseInt(curStr, 10) || 0;
          const max = parseInt(maxStr, 10) || 0;
          return { current, max };
        } catch {
          return { current: 0, max: 0 };
        }
      };

      const { current, max } = parse(party.attendees || '0/0');
      let nextCurrent = current;
      if (action === 'going') {
        nextCurrent = Math.min(max || 0, current + 1);
      } else if (action === 'not-going') {
        nextCurrent = Math.max(0, current - 1);
      } // 'maybe' leaves counts unchanged

      const nextAttendees = `${nextCurrent}/${max || 0}`;

      const { data: updatedRows, error: updateErr } = await supabaseCli
        .from('parties')
        .update({ attendees: nextAttendees })
        .eq('id', id)
        .select();

      if (updateErr) {
        console.error('[updateAttendance] Update error:', updateErr);
        return res.status(500).json({ success: false, message: 'Failed to update attendance' });
      }

      return res.status(200).json({
        success: true,
        attendance: {
          current: nextCurrent,
          max: max || 0,
          display: nextAttendees,
        },
        party: updatedRows?.[0] || { id, attendees: nextAttendees },
        action,
      });
    } catch (e) {
      console.error('[updateAttendance] Unexpected error:', e);
      return res.status(500).json({ success: false, message: 'Unexpected error' });
    }
  },
  createParty,
  getAdminStatistics,
  getAdminParties,
  getAdminMetrics,
  deleteParty,
  uploadPartyImage,
  updateParty,
  getPartyDescription
};
