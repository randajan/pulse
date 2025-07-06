
import { info, log } from "@randajan/simple-lib/node";
import createPulse from "../../dist/esm/index.mjs";

createPulse({
    autoStart:true,
    onPulse:(meta)=>{
        const { started, runtime, warnings, warn } = meta;
        warn("AAAA");
        console.log({ started, runtime, warnings });
        throw new Error("wtf");
    },
    interval:5000,
    offset:200,
    onError:(err)=>{ console.error(err); },
    getNow:()=>Date.now()
});