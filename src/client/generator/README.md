# src/client/generator
Per-file ViewController client code generation pipeline.

- `parseControllerFile.ts`: Extracts decorated controllers/callables from TS source.
- `pathMapping.ts`: Maps server files to mirrored client output paths.
- `emitClientFiles.ts`: Writes `.generated.ts` and create-if-missing wrapper files.
- `index.ts`: Orchestrates generation for one source file.
