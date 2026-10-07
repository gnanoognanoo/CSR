// Attribution recorded in the supplied model files and preparation manifests.
// Null fields mean the supplied asset did not include that metadata.
export interface ModelCredit {
  divisionId: string;
  title: string;
  author: string | null;
  sourceUrl: string | null;
  license: string | null;
  licenseUrl: string | null;
  changes: string;
}

export const modelCredits: readonly ModelCredit[] = [
  {
    "divisionId": "ai",
    "title": "User-supplied AI model",
    "author": null,
    "sourceUrl": null,
    "license": null,
    "licenseUrl": null,
    "changes": "Scene graph flattened, compatible static meshes joined, duplicate vertices welded, geometry simplified within stated error bounds, textures resized and compressed to WebP, Meshopt geometry compression. Original materials and model identity retained."
  },
  {
    "divisionId": "embedded",
    "title": "PCB NVIDIA RTX 4090 Graphic Card",
    "author": "damongraphics",
    "sourceUrl": "https://sketchfab.com/3d-models/pcb-nvidia-rtx-4090-graphic-card-0eeef36c440f44f586501532dd61bba0",
    "license": "CC-BY-4.0",
    "licenseUrl": "http://creativecommons.org/licenses/by/4.0/",
    "changes": "Scene graph flattened, compatible static meshes joined, duplicate vertices welded, geometry simplified within stated error bounds, textures resized and compressed to WebP, Meshopt geometry compression. Original materials and model identity retained."
  },
  {
    "divisionId": "robotics",
    "title": "PhantomX Hexapod MKIII",
    "author": "Interbotix",
    "sourceUrl": "https://sketchfab.com/3d-models/phantomx-hexapod-mkiii-59c19fa10e764e2d84cae552ab90f6c9",
    "license": "CC-BY-SA-4.0",
    "licenseUrl": "http://creativecommons.org/licenses/by-sa/4.0/",
    "changes": "Scene graph flattened, compatible static meshes joined, duplicate vertices welded, geometry simplified within stated error bounds, textures resized and compressed to WebP, Meshopt geometry compression. Original materials and model identity retained."
  },
  {
    "divisionId": "software",
    "title": "Gaming Laptop",
    "author": "Blue Lantern",
    "sourceUrl": "https://sketchfab.com/3d-models/gaming-laptop-4e72a2078b3c4a75a821ab09830693fe",
    "license": "CC-BY-4.0",
    "licenseUrl": "http://creativecommons.org/licenses/by/4.0/",
    "changes": "Scene graph flattened, compatible static meshes joined, duplicate vertices welded, geometry simplified within stated error bounds, textures resized and compressed to WebP, Meshopt geometry compression. Original materials and model identity retained."
  },
  {
    "divisionId": "iot",
    "title": "Smart Thermostat – Wall Mounted Concept",
    "author": "MidaZ_3D",
    "sourceUrl": "https://sketchfab.com/3d-models/smart-thermostat-wall-mounted-concept-d4df578a903c42bca31d722109279a2f",
    "license": "CC-BY-NC-4.0",
    "licenseUrl": "http://creativecommons.org/licenses/by-nc/4.0/",
    "changes": "Scene graph flattened, compatible static meshes joined, duplicate vertices welded, geometry simplified within stated error bounds, textures resized and compressed to WebP, Meshopt geometry compression. Original materials and model identity retained."
  },
  {
    "divisionId": "research",
    "title": "book folded and unfolded",
    "author": "PremModel",
    "sourceUrl": "https://sketchfab.com/3d-models/book-folded-and-unfolded-7c4f0b00dc1b4852b1c1f6b6f3d37f7f",
    "license": "CC-BY-4.0",
    "licenseUrl": "http://creativecommons.org/licenses/by/4.0/",
    "changes": "Scene graph flattened, compatible static meshes joined, duplicate vertices welded, geometry simplified within stated error bounds, textures resized and compressed to WebP, Meshopt geometry compression. Original materials and model identity retained."
  },
  {
    "divisionId": "operations",
    "title": "Gears",
    "author": "melaamory",
    "sourceUrl": "https://sketchfab.com/3d-models/gears-1fa1e31142714a11a2a77606c416aa05",
    "license": "CC-BY-4.0",
    "licenseUrl": "http://creativecommons.org/licenses/by/4.0/",
    "changes": "Scene graph flattened, compatible static meshes joined, duplicate vertices welded, geometry simplified within stated error bounds, textures resized and compressed to WebP, Meshopt geometry compression. Original materials and model identity retained."
  }
];
