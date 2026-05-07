import { createServer, IncomingMessage, ServerResponse } from "http";

const PORT = 8080;

const server = createServer(
    (_req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, {"Content-Type": "text/plain" });
        res.end("Hello World!\n")
    }
);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});