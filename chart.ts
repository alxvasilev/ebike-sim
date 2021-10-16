type Values = Array<number>;

class LiveChart {
    valCount: number = 0;
    valMaxCount: number;
    prevSample?: Values;
    lastSample?: Values;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    blackPixel: ImageData;
    yScale: number;
    scalingY: boolean;
    constructor(canvas: HTMLCanvasElement, maxY: number) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.yScale = canvas.height / maxY;
        this.scalingY = (Math.abs(this.yScale - 1.0) > 0.00001);
        if (this.scalingY) {
//            this.ctx.scale(1, yScale);
        }
        this.valMaxCount = canvas.width;
        let pix = this.blackPixel = this.ctx.createImageData(1, 1);
        let data = pix.data;
        data[0] = data[1] = data[2] = 0;
        data[3] = 255;
    }
    addValues(sample: Values) {
        if (this.valCount >= this.valMaxCount) {
            this.scrollCanvas();
        } else {
            this.valCount++;
        }
        this.prevSample = this.lastSample;
        this.lastSample = sample;
        if (!this.prevSample) {
            return;
        }
        let ctx = this.ctx;
        let height = this.canvas.height;
        let x = this.valCount-1;
        let yScale = this.yScale;
        if (this.scalingY) {
            this.ctx.beginPath();
            for (let i = 0; i < sample.length; i++) {
                this.ctx.moveTo(x-1, height - this.prevSample[i]*yScale - 1);
                this.ctx.lineTo(x, height - sample[i] * yScale - 1);
            }
            ctx.closePath();
            ctx.stroke();
        } else {
            for (let i = 0; i < sample.length; i++) {
                this.ctx.putImageData(this.blackPixel, x, Math.round(height - sample[i]-1));
            }
        }
    }
    scrollCanvas() {
        let ctx = this.ctx;
        var imageData = ctx.getImageData(1, 0, this.canvas.width-1, this.canvas.height);
        ctx.putImageData(imageData, 0, 0);
        // now clear the right-most pixels:
        ctx.clearRect(this.canvas.width-1, 0, 1, this.canvas.height);
    }
};