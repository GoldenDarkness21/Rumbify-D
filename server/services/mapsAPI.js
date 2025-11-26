const https = require("https");
const querystring = require("querystring");

/**
 * Geocode an address text using OpenStreetMap Nominatim (no API key required)
 * @param {string} address
 * @returns {Promise<{ok: boolean, formatted?: string, lat?: number, lon?: number, raw?: any, error?: string}>}
 */
async function geocodeAddress(address) {
  return new Promise((resolve) => {
    try {
      if (!address || !String(address).trim()) {
        return resolve({ ok: false, error: "Empty address" });
      }

      const params = querystring.stringify({
        q: address,
        format: "json",
        addressdetails: 1,
        limit: 1,
      });
      const url = `https://nominatim.openstreetmap.org/search?${params}`;
      const options = {
        headers: {
          "User-Agent": "Rumbify/1.0 (contact: dev@rumbify.local)",
          "Referer": "http://localhost:5052/",
          "Accept-Language": "es",
        },
      };

      https
        .get(url, options, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              if (Array.isArray(json) && json.length > 0) {
                const first = json[0];
                const formatted = first.display_name;
                const lat = Number(first?.lat);
                const lon = Number(first?.lon);
                return resolve({ ok: true, formatted, lat, lon, raw: first });
              }
              return resolve({ ok: false, error: "No results" });
            } catch (e) {
              return resolve({ ok: false, error: e?.message || "Parse error" });
            }
          });
        })
        .on("error", (err) => {
          return resolve({ ok: false, error: err?.message || "Request error" });
        });
    } catch (error) {
      return resolve({ ok: false, error: error?.message || "Unexpected error" });
    }
  });
}

module.exports = { geocodeAddress };