
import { info, log } from "@randajan/simple-lib/node";
import createPulse from "../../dist/esm/index.mjs";

createPulse({
    autoStart:true,
    onPulse:async (meta)=>{
        const { started, runtime, warnings, warn } = meta;
        warn("AAAA");
        //throw new Error("wtf");
        //await new Promise(res=>setTimeout(res, Math.random()*1000));
        return "bla";
    },
    interval:100,
    // offset:1000,
    onError:(err)=>{ console.error(err); },
    getNow:()=>Date.now(),
    afterPulse:meta=>{
        console.log("RES");
        console.log("effect", new Date(meta.started), {...meta});
    },
    //noMeta:true
});