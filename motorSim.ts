function assert(cond: any) {
    if (!cond) {
        throw new Error("Assertion failed");
    }
}

class Ebike {
    motorWindingR!: number;
    motorKv!: number;
    motorKt!: number;
    motorI0!: number;

    battVoltage!: number;
    battR!: number;
    battMaxI!: number;
    systemR!: number;
    wheelRadius!: number;
    wheelRR!: number;
    wheelCircumf: number;
    cdA!: number;
    weight!: number;
    slope!: number;
    protected throttle: number = 0;
    protected _targetThrottle: number = 0;
    curRpm: number = 0;
    curBattI: number = 0;
    curMotorI: number = 0;
    curTorque: number = 0;
    constructor(config: {
        motorWindingR: number,
        motorKv: number,
        motorI0: number,
        battVoltage: number,
        battR: number;
        battMaxI: number;
        systemR: number;
        wheelRadius: number,
        wheelRR: number;
        cdA: number,
        weight: number,
        slope: number
    }) {
        Object.assign(this, config);
        this.motorKt = (60 / (2 * Math.PI * this.motorKv));
        this.wheelCircumf = 2 * Math.PI * this.wheelRadius;
    }
    reset() {
        this.curRpm = 0;
    }
    tick(period: number) { // 1ms tick
        let force = this.curForce();
        let accel = force / this.weight;
        let newSpeed = this.curSpeed() + accel * period;
        this.curRpm = newSpeed * 60 / this.wheelCircumf;
        return newSpeed;
    }
    curSpeed() {
        return this.wheelCircumf * this.curRpm / 60;
    }
    dragForce() {
        let speed = this.curSpeed();
        let weightForce = this.weight * 9.81;
        let drag = (1.204 * (speed ** 2) * this.cdA) / 2; // air drag, air density at 20C
        if (speed > 0.001) {
            // this.slope is the sine of the grade angle, we need the cosine
            drag += Math.sqrt(1 - this.slope**2) * weightForce * this.wheelRR; // rolling resistance of two wheels
        }
        drag += this.slope * weightForce; // slope
        return drag;
    }
    dragPower() {
        return this.dragForce() * this.curSpeed();
    }
    curForce() {
        let motorBackEmf = this.curRpm / this.motorKv;
        let totalR = this.systemR + this.motorWindingR;
        let motorIm = -(motorBackEmf + this.battR*(this.throttle**2)*this.motorI0 - this.throttle*this.battVoltage) / (totalR + this.battR*(this.throttle**2));
        if (motorIm < 0.0) {
            motorIm = 0.0;
        }
        let battI = motorIm * this.throttle; // ignore I0 because it will make throttle equation very complex

        if ((battI > this.battMaxI) || (battI < this.battMaxI && this.throttle < this._targetThrottle)) {
            let throttle = -(Math.sqrt(motorBackEmf**2 + 4*this.battMaxI*totalR*(this.battVoltage-this.battMaxI*this.battR)) + motorBackEmf) / (2*this.battMaxI*this.battR - 2*this.battVoltage);
            this.setEffThrottle(throttle);

            motorIm = -(motorBackEmf + this.battR*(this.throttle**2)*this.motorI0 - this.throttle*this.battVoltage) / (totalR + this.battR*(this.throttle**2));
            battI = motorIm * this.throttle;
        }
        assert(battI <= this.battMaxI + 0.000001);
        this.curMotorI = motorIm + this.motorI0;
        this.curBattI = this.curMotorI * this.throttle;
        this.curTorque = motorIm * this.motorKt;
        return this.curTorque / this.wheelRadius - this.dragForce();
    }
    curEfficiency() {
        let mechP = this.curTorque * (this.curRpm / 60) * 2 * Math.PI;
        let elecP = this.curBattI * (this.battVoltage - this.battR*this.curBattI) - (this.curMotorI**2)*this.systemR;
        return mechP / elecP;
    }
    motorHeatW() {
        return this.motorWindingR * this.curMotorI**2;
    }
    setThrottle(val: number) {
        if (val > 1) {
            val = 1;
        } else if (val < 0) {
            val = 0;
        }
        this._targetThrottle = val;
        this.setEffThrottle(val);
    }
    protected setEffThrottle(val: number) {
        this.throttle = (val > this._targetThrottle) ? this._targetThrottle : val;
    }
    get effThrottle() { return this.throttle; }
    get targetThrottle() { return this._targetThrottle; }
}

function tenth(val: number) {
    let str = '' + Math.round(val * 10) / 10;
    let dec = Math.abs(val % 1);
    if (dec < 0.05 || dec >= 0.95) {
        str += '.0';
    }
    return (str.length < 4) ? (' ' + str) : str;
}

if (typeof window === "undefined") {
    let ebike = new Ebike({
        motorWindingR: 0.1,
        motorKv: 7.4,
        motorI0: 0.9,
        battVoltage: 60,
        battR: 0.15,
        battMaxI: 28,
        systemR: 0.1,
        wheelRadius: 0.3685,
        wheelRR: 0.010,
        cdA: 0.62,
        weight: 110,
        slope: 0.0
    });
    ebike.setThrottle(0.985);
    setInterval(() => {
        let speed = ebike.tick(0.030);
        let mechP = ebike.curTorque * (ebike.curRpm / 60) * 2 * Math.PI;
        let elecP = ebike.curBattI * ebike.battVoltage;
        let kph = speed * 3600 / 1000;
        console.log(
            "kph:", tenth(kph), "thr:", tenth(ebike.effThrottle*100),
            "Im:", tenth(ebike.curMotorI), "Ib:", tenth(ebike.curBattI),
            "Pe:", tenth(elecP), "Pm:", tenth(mechP), "wh/Km:", tenth(elecP / kph),
            "rpm:", tenth(ebike.curRpm), "torq:", tenth(ebike.curTorque),
            "eff:", tenth(mechP  * 100 / elecP), "dragP:", tenth(ebike.dragPower()));
    }, 30);
}