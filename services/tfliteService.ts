
export class TFLiteService {
    private model: any = null;
    private tf: any = null;
    private tflite: any = null;

    async initialize() {
        if (this.tflite) return;
        
        try {
            // Load TFJS Core normally
            // @ts-ignore
            this.tf = await import('@tensorflow/tfjs');
            
            // Ensure global tf is available for the script we are about to inject
            if (!(window as any).tf) {
                (window as any).tf = this.tf;
            }

            // Load TFLite via Global Script to avoid ESM/WASM path resolution issues
            if (!(window as any).tflite) {
                console.log("Injecting TFLite Script...");
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/tf-tflite.min.js';
                    script.onload = resolve;
                    script.onerror = (e) => reject(new Error(`Script load failed: ${e}`));
                    document.head.appendChild(script);
                });
            }

            // @ts-ignore
            this.tflite = (window as any).tflite;

            // Set WASM Path explicitly to a reliable CDN
            this.tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/');
            
            console.log("TFLite Initialized via Script Injection");
        } catch (e) {
            console.error("TFLite Init Error", e);
            throw new Error("Failed to initialize TensorFlow Lite runtime.");
        }
    }

    async loadModelFromFile(file: File) {
        await this.initialize();
        
        // Use createObjectURL to handle large files without reading into memory string
        const url = URL.createObjectURL(file);
        
        try {
            console.log("Loading model from blob URL:", url);
            // loadTFLiteModel can take a URL
            this.model = await this.tflite.loadTFLiteModel(url);
            console.log("Model loaded successfully");
            return this.model;
        } catch (e) {
            console.error("Model Load Error", e);
            throw e;
        }
    }

    async predict(inputData: any) {
        if (!this.model) throw new Error("No model loaded");
        
        // Predict
        const outputTensor = this.model.predict(inputData);
        return outputTensor;
    }

    processImage(imgElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
        if (!this.tf) throw new Error("TF not initialized");
        
        return this.tf.tidy(() => {
            let tensor = this.tf.browser.fromPixels(imgElement);
            // Resize to 224x224 (Standard for MobileNet/EfficientNet)
            tensor = this.tf.image.resizeBilinear(tensor, [224, 224]);
            tensor = tensor.expandDims(0);
            // Normalize [0, 255] -> [0, 1]
            return tensor.div(255.0);
        });
    }
}

export const tfliteService = new TFLiteService();
