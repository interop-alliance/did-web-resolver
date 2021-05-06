mkdir ./dist/esm
cat >dist/esm/index.js <<!EOF
import cjsModule from '../index.js';
export const driver = cjsModule.driver;
export const DidWebResolver = cjsModule.DidWebResolver;
export const didFromUrl = cjsModule.didFromUrl;
export const urlFromDid = cjsModule.urlFromDid;
!EOF

cat >dist/esm/package.json <<!EOF
{
  "type": "module"
}
!EOF
