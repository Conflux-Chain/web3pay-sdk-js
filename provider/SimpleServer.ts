import * as http from "http";
import {IncomingMessage, RequestListener, ServerResponse} from "http";

require('dotenv').config()

async function main() {
	const requestListener:RequestListener = function (_req: IncomingMessage, res:http.ServerResponse) {
		res.writeHead(200);
		const data = {code: 0, message: 'Hello, World!'}
		res.end(JSON.stringify(data));
	}

	const server = http.createServer(requestListener);
	let port = process.env.PROVIDER_PORT;
	console.log(`provider port is ${port}`)
	server.listen(port);
}

if (module == require.main) {
	main().then()
}