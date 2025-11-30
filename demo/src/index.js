
import { info, log } from "@randajan/simple-lib/node";
import createPulse from "../../dist/esm/index.mjs";

const pulse = createPulse({
    autoStart:true,
    //noMeta:true,
    onPulse:async (p, meta)=>{
        const { id, started, runtime, warnings, warn } = meta;
        //warn("AAAA");
        throw new Error("wtf");
        //await new Promise(res=>setTimeout(res, Math.random()*1000));
        
        return Math.random();
    },
    interval:1000,
    // offset:1000,
    onError:(p, error)=>{ console.error(error); },
    getNow:()=>Date.now(),
    afterPulse:(p, id)=>{
        //const { id, started, runtime, warnings, warn } = meta;
        console.log("RES", id);
        if (id >= 5) { p.reset(); }
        //console.log("effect", new Date(meta.started), {...meta});
    },
    onStart:()=>{ console.log("start"); },
    onStop:()=>{ console.log("stop"); },
    noMeta:true
});

createPulse({
    autoStart:true,
    interval:3000,
    onPulse:_=>console.log("check", pulse.last),
    onError:(_, err)=>console.warn("err", err),
    noMeta:true
})
