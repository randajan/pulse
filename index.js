import slib, { argv } from "@randajan/simple-lib";

const {isBuild } = argv;

slib(
    isBuild,
    {
        mode:"node",
        demo:{
            loader:{
                ".json":"text"
            }
        },
        lib:{
            entries:[
                "index.js",
            ]
        },
    }
);