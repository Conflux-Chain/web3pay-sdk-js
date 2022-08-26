import {HttpClient} from "typed-rest-client/HttpClient"

const web3pay : {client?: HttpClient, billingUrl: string, billingApiKey: string} = {
    client: null, billingUrl: "",
    billingApiKey: "",
}

export function initWeb3payClient(billingUrl: string, billingApiKey: string, timeout: number = 1000, userAgent:string = "web3pay client") {
    web3pay.client = new HttpClient(userAgent,
        undefined, {socketTimeout: timeout}
        );
    web3pay.billingUrl = billingUrl;
    web3pay.billingApiKey = billingApiKey;
}


// request billing service
export async function billing(path: string, dryRun:boolean, consumerKey) {
    const headers = {
        "Content-Type": "application/json",
        "Billing-Key": web3pay.billingApiKey,
        "Customer-Key": consumerKey,
    }
    const data = {
        resourceId: path,
        dryRun
    }
    const billingResult = await web3pay.client.post(`${web3pay.billingUrl}`,
        JSON.stringify(data),
        headers)
        .then(res=>res.readBody())
        .then(res=>{
            try {
                return JSON.parse(res)
            } catch (e) {
                console.log(`invalid response.`, res, e)
                console.log(`request info, data`, data, ` headers`, headers)
            }
            return {code: 500, billingText: res, message:`billing server returns invalid content.`}
        })
    // console.log(`billing result is`, billingResult)
    return billingResult
}