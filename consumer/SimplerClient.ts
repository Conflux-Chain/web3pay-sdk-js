import {fetchJson} from "ethers/lib/utils";

require('dotenv').config()

async function main() {
	let port = process.env.PROVIDER_PORT;
	console.log(`provider port is ${port}`)
	const result = await fetchJson(`http://localhost:${port}`)
	console.log(`result is `, result)
}

if (module === require.main) {
	main().then()
}