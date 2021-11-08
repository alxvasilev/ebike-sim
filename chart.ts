type Sample = Array<number>;
class Series {
    name: string;
    color: string;
    pixel: ImageData;
    yScale: number;
    scalingY: boolean;
    constructor(name: string, maxVal: number, color: string, ctx: CanvasRenderingContext2D) {
        this.name = name;
        if (color.charAt(0) !== '#') {
            throw new Error("Color must start with #");
        }
        let colorVal = parseInt(color.substr(1), 16);
        if (isNaN(colorVal)) {
            throw new Error("Error parsing color hex value");
        }
        this.color = color;
        this.yScale = ctx.canvas.height / (maxVal+1);
        this.scalingY = (Math.abs(this.yScale - 1.0) > 0.00001);

        let pix = this.pixel = ctx.createImageData(1, 1);
        let data = pix.data;
        data[0] = colorVal >> 24;
        data[1] = (colorVal >> 16) & 0xff;
        data[2] = (colorVal >> 8) & 0xff;
        data[3] = 255;
    }
}

export class LiveChart {
    valCount: number = 0;
    valMaxCount: number;
    prevSample?: Sample;
    lastSample?: Sample;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    series: Series[] = [];
    constructor(canvas: HTMLCanvasElement, maxY: number) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.valMaxCount = canvas.width;
    }
    addSeries(name: string, color: string, maxVal: number) {
        this.series.push(new Series(name, maxVal, color, this.ctx));
    }
    addSample(sample: Sample) {
        let series = this.series;
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
        for (let i = 0; i < series.length; i++) {
            let ser = series[i];
            let val = sample[i];
            if (val == null) {
                continue;
            }
            if (ser.scalingY) {
                let prevVal = this.prevSample[i];
                if (prevVal == null) {
                    continue;
                }
                let yScale = ser.yScale;
                this.ctx.beginPath();
                ctx.strokeStyle = series[i].color;
                this.ctx.moveTo(x-1, height - prevVal * yScale - 1);
                this.ctx.lineTo(x, height - val * yScale - 1);
                ctx.closePath();
                ctx.stroke();
            } else {
                this.ctx.putImageData(series[i].pixel, x, Math.round(height - val - 1));
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
    reset() {
        this.valCount = 0;
        this.lastSample = this.prevSample = undefined;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
};
