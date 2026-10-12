import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./tests/node-alias-loader.mjs", pathToFileURL("./"));
