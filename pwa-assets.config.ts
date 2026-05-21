import {
  combinePresetAndAppleSplashScreens,
  createAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

const preset = {
  ...minimal2023Preset,
  apple: {
    sizes: [180],
    padding: 0,
    resizeOptions: { background: "#1B5AA7", fit: "contain" as const },
  },
};

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: combinePresetAndAppleSplashScreens(
    preset,
    createAppleSplashScreens(
      {
        padding: 0.3,
        resizeOptions: { background: "#1B5AA7", fit: "contain" },
        darkResizeOptions: { background: "#1B5AA7", fit: "contain" },
        linkMediaOptions: { log: true, addMediaScreen: true, basePath: "/", xhtml: false },
        png: { compressionLevel: 9, quality: 60 },
      },
      [
        'iPad Air 9.7"',
        'iPad Pro 10.5"',
        'iPad Pro 11"',
        'iPad Pro 12.9"',
        "iPhone 14 Pro Max",
        "iPhone 14 Pro",
        "iPhone 14 Plus",
        "iPhone 14",
        "iPhone 13 Pro Max",
        "iPhone 13 Pro",
        "iPhone 13",
        "iPhone 13 mini",
        "iPhone 11 Pro Max",
        "iPhone 11 Pro",
        "iPhone 11",
        "iPhone XS Max",
        "iPhone XS",
        "iPhone XR",
        "iPhone X",
        "iPhone 8 Plus",
        "iPhone 8",
      ],
    ),
  ),
  images: ["public/pwa-icon.svg"],
});
