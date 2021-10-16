"use strict";
var Series = /** @class */ (function () {
    function Series(name, maxVal, color, ctx) {
        this.name = name;
        if (color.charAt(0) !== '#') {
            throw new Error("Color must start with #");
        }
        var colorVal = parseInt(color.substr(1), 16);
        if (isNaN(colorVal)) {
            throw new Error("Error parsing color hex value");
        }
        this.color = color;
        this.yScale = ctx.canvas.height / (maxVal + 1);
        this.scalingY = (Math.abs(this.yScale - 1.0) > 0.00001);
        var pix = this.pixel = ctx.createImageData(1, 1);
        var data = pix.data;
        data[0] = colorVal >> 24;
        data[1] = (colorVal >> 16) & 0xff;
        data[2] = (colorVal >> 8) & 0xff;
        data[3] = 255;
    }
    return Series;
}());
var LiveChart = /** @class */ (function () {
    function LiveChart(canvas, maxY) {
        this.valCount = 0;
        this.series = [];
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.valMaxCount = canvas.width;
    }
    LiveChart.prototype.addSeries = function (name, color, maxVal) {
        this.series.push(new Series(name, maxVal, color, this.ctx));
    };
    LiveChart.prototype.addValues = function (sample) {
        var series = this.series;
        if (sample.length < series.length) {
            throw new Error("Missing values for all series");
        }
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
        for (var i = 0; i < series.length; i++) {
            var ser = series[i];
            if (ser.scalingY) {
                var yScale = ser.yScale;
                this.ctx.beginPath();
                ctx.strokeStyle = series[i].color;
                this.ctx.moveTo(x - 1, height - this.prevSample[i] * yScale - 1);
                this.ctx.lineTo(x, height - sample[i] * yScale - 1);
                ctx.closePath();
                ctx.stroke();
            }
            else {
                this.ctx.putImageData(series[i].pixel, x, Math.round(height - sample[i] - 1));
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
