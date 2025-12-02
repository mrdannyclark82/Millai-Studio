
export class TFLiteService {
    private model: any = null;
    private tf: any = null;
    private tflite: any = null;

    async initialize() {
        if (this.model) return;
        
        // Dynamic import to prevent initial load bloat
        // @ts-ignore
        this.tf = await import('@tensorflow/tfjs');
        // @ts-ignore
        this.tflite = await import('@tensorflow/tfjs-tflite');

        // Set WASM Path to JSDelivr to ensure it loads correctly without local setup
        this.tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/');
    }

    async loadModelFromFile(file: File) {
        await this.initialize();
        const url = URL.createObjectURL(file);
        // loadTFLiteModel expects a URL
        this.model = await this.tflite.loadTFLiteModel(url);
        return this.model;
    }

    async predict(inputData: any) {
        if (!this.model) throw new Error("No model loaded");
        
        // Input should be a Tensor
        // If passing raw data, convert: const input = tf.tensor(data);
        const outputTensor = this.model.predict(inputData);
        return outputTensor;
    }

    // Helper to process an image from an HTML element into a Tensor
    processImage(imgElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
        if (!this.tf) throw new Error("TF not initialized");
        // Create a tensor from the image
        let tensor = this.tf.browser.fromPixels(imgElement);
        // Resize to common TFLite model size (e.g. 224x224) - Make adjustable later?
        tensor = this.tf.image.resizeBilinear(tensor, [224, 224]);
        // Expand dims to create a batch of 1: [1, 224, 224, 3]
        tensor = tensor.expandDims(0);
        // Normalize to 0-1 or -1 to 1 depending on model. Assuming 0-255 -> 0-1 for now.
        return tensor.div(255.0);
    }
}

export const tfliteService = new TFLiteService();
