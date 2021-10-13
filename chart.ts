type Values = Array<number>;

class LiveChart {
    xStep: number;
    valCount: number;
    values: Values[] = [];
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    constructor(canvas: HTMLCanvasElement, xstep: number) {
        this.canvas = canvas;
        this.xStep = xstep;
        this.ctx = canvas.getContext("2d")!;
        this.valCount = Math.floor(canvas.width / this.xStep);
       // this.ctx.lineWidth = 1;
    }
    addValues(sample: Values) {
        if (this.values.length >= this.valCount) {
            this.values.shift();
            this.scrollCanvas();
        }
        this.values.push(sample);
        if (this.values.length <= 1) {
            return;
        }
        this.ctx.beginPath();
        let height = this.canvas.height;
        let vals = this.values;
        let len = vals.length;
        for (let i = 0; i < sample.length; i++) {
            this.ctx.moveTo(this.xStep * (len - 1), height - vals[len-2][i]);
            this.ctx.lineTo(this.xStep * len, height - vals[len-1][i]);
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }
    scrollCanvas() {
        let ctx = this.ctx;
        var imageData = ctx.getImageData(this.xStep, 0, this.canvas.width-this.xStep, this.canvas.height);
        ctx.putImageData(imageData, 0, 0);
        // now clear the right-most pixels:
        ctx.clearRect(this.canvas.width-this.xStep, 0, this.xStep, this.canvas.height);
    }
};