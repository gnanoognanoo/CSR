export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response("Not Found", { status: 404 });
  },
};
