
import { info, log } from "@randajan/simple-lib/node";
import createPulse from "../../dist/esm/index.mjs";

createPulse({
    autoStart:true,
    //noMeta:true,
    onPulse:async (p, meta)=>{
        const { id, started, runtime, warnings, warn } = meta;
        //warn("AAAA");
        throw new Error("wtf");
        //await new Promise(res=>setTimeout(res, Math.random()*1000));
        
        return "bla";
    },
    interval:1000,
    // offset:1000,
    //onError:(p, error)=>{ console.error(error); },
    getNow:()=>Date.now(),
    afterPulse:(p, meta)=>{
        const { id, started, runtime, warnings, warn } = meta;
        console.log("RES", meta);
        if (id >= 5) { p.reset(); }
        //console.log("effect", new Date(meta.started), {...meta});
    },
    onStart:()=>{ console.log("start"); },
    onStop:()=>{ console.log("stop"); }
    //noMeta:true
});