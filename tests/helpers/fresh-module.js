import {readFileSync} from 'node:fs';

// The generated hook is self-contained. Evaluate its exact source in a fresh
// scope for each simulated reload. File-URL queries are not reliable cache
// boundaries in Bun; filesystem reads also handle Windows drive paths and
// literal spaces, Unicode, # and % without interpreting them as URL syntax.
export async function freshModule(source){
 const code=readFileSync(source,'utf8').replace(/^export (?=const |function )/gm,'');
 return new Function(code+'\nreturn {register};')();
}
