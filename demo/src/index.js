
import { info, log } from "@randajan/simple-lib/node";
import createPulse, { stopAllPulses } from "../../dist/esm/index.mjs";

const pulse = createPulse({
    autoStart:true,
    //noMeta:true,
    maxRuns:6,
    onPulse:async (p, meta)=>{
        const { id, started, runtime, warnings, warn } = meta;
        //throw new Error("wtf");
        await new Promise(res=>setTimeout(res, Math.random()*1000));
        return Math.random();
    },
    align:false,
    interval:500,
    offset:500,
    onError:(p, error)=>{ console.error(error); },
    getNow:()=>Date.now(),
    afterPulse:(p, meta)=>{
        const { id, started, runtime, warnings, warn, lateBy } = meta;
        console.log("FIRE", id, lateBy);
        if (id >= 5) { p.reset(); }
        //console.log("effect", new Date(meta.started), {...meta});
    },
    onStart:()=>{ console.log("start"); },
    onStop:()=>{ console.log("stop"); }, 
    //noMeta:true
});

createPulse({
    //autoStart:true,
    align:false,
    interval:500,
    onPulse:_=>console.log("check", pulse.countdown, (new Date(Date.now()+pulse.potential)).toLocaleTimeString()),
    onError:(_, err)=>console.warn("err", err),
    noMeta:true
});
