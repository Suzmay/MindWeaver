export default {
  async fetch(request) {
    return new Response(JSON.stringify({ ok: true, message: "Minimal Worker test" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};