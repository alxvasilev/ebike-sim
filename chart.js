"use strict";
var LiveChart = /** @class */ (function () {
    function LiveChart(canvas, maxY) {
        this.valCount = 0;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.yScale = canvas.height / maxY;
        this.scalingY = (Math.abs(this.yScale - 1.0) > 0.00001);
        if (this.scalingY) {
            //            this.ctx.scale(1, yScale);
        }
        this.valMaxCount = canvas.width;
        var pix = this.blackPixel = this.ctx.createImageData(1, 1);
        var data = pix.data;
        data[0] = data[1] = data[2] = 0;
        data[3] = 255;
    }
    LiveChart.prototype.addValues = function (sample) {
        if (this.valCount >= this.valMaxCount) {
            this.scrollCanvas();
        }
        else {
            this.valCount++;
        }
        this.prevSample = this.lastSample;
        this.lastSample = sample;
        if (!this.prevSample) {
            return;
        }
        var ctx = this.ctx;
        var height = this.canvas.height;
        var x = this.valCount - 1;
        var yScale = this.yScale;
        if (this.scalingY) {
            this.ctx.beginPath();
            for (var i = 0; i < sample.length; i++) {
                this.ctx.moveTo(x - 1, height - this.prevSample[i] * yScale - 1);
                this.ctx.lineTo(x, height - sample[i] * yScale - 1);
            }
            ctx.closePath();
            ctx.stroke();
        }
        else {
            for (var i = 0; i < sample.length; i++) {
                this.ctx.putImageData(this.blackPixel, x, Math.round(height - sample[i] - 1));
            }
        }
    };
    LiveChart.prototype.scrollCanvas = function () {
        var ctx = this.ctx;
        var imageData = ctx.getImageData(1, 0, this.canvas.width - 1, this.canvas.height);
        ctx.putImageData(imageData, 0, 0);
        // now clear the right-most pixels:
        ctx.clearRect(this.canvas.width - 1, 0, 1, this.canvas.height);
    };
    return LiveChart;
}());
;
