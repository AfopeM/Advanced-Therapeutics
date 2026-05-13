// (already inside vite/client — you don't write this)
declare module "*.svg" {
  const src: string;
  export default src;
}
