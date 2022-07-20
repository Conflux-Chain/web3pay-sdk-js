import * as http from "http";
import {IncomingMessage, RequestListener, ServerResponse} from "http";
import {accountInfo, ethersSign} from "../lib/lib";
import {fetchJson} from "ethers/lib/utils";
import {HttpClient} from "typed-rest-client/HttpClient"

require('dotenv').config()
let {PROVIDER_PORT: port, PROVIDER_PK: pk, APP: app, RPC_ENDPOINT, RPC_BILLING} = process.env;
const client = new HttpClient("SimpleServer");

// request billing service
async function billing(app: string, path: string, dryRun:boolean, {seed:consumerSeed, sig}:{seed:string, sig:string}) {
	const seed = app;
	const headers = {
		"App-Contract": app,
		"Owner-Signature": await ethersSign(seed, pk!),
		"App-Nonce": consumerSeed,
		"Customer-Signature":sig
	}
	const data = {
		resourceId: path,
		dryRun
	}
	const billingResult = await client.post(`${RPC_BILLING}`,
		JSON.stringify(data),
		headers)
		.then(res=>res.readBody())
		.then(JSON.parse)
	console.log(`billing result is`, billingResult)
	return billingResult
}
async function requestListener(req: IncomingMessage, res:http.ServerResponse) {
	const {url} = req;
	console.log(`request ${url}`)

	if (url!.startsWith("/a-valuable-resource")) {
		let billingResult = await billing(app!, req.url!.split('?')[0], false, req.headers as any);
		let code = 0
		let message = 'Billing succeed!'
		if (billingResult.code) {
			message = `Billing failed`
		}

		res.writeHead(200);
		const data = {code, message, headers: req.headers, billingResult}
		res.end(JSON.stringify(data));
		return
	}

	res.writeHead(200);
	const data = {code: 0, message: 'Hello, World!', headers: req.headers}
	res.end(JSON.stringify(data));
}
async function main() {
	// await billing(app!, "/test-path", {seed: "0x0979193d54bf5cd4d4958944c52ac66deede4f2a_1658298895942",
	// 	sig: "0x5a6e7d63a320c565482dbe8c6b8afae63cbc3734ffa185536f209dfa8fa52f24608ce47f291f3285e8dc05230a31c70dd26422accbc2a723c4328e1510d72d6d1c"});
	await serve();
}
async function serve() {
	const server = http.createServer(requestListener);
	console.log(`provider port is ${port}`)
	console.log(`app [${app}]`)
	await accountInfo(pk!, RPC_ENDPOINT!)
	server.listen(port);
}

if (module == require.main) {
	main().then()
}