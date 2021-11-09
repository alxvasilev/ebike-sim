module.exports = {
    entry: {
        'pid.js' : './pid.ts',
        'pidGui.js': './pidGui.ts',
        'motorSim.js': './motorSim.ts',
        'chart.js': './chart.ts'
    },
    mode: 'production',
    optimization: {
        minimize: false
    },
    // devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: '[name]',
        path: __dirname,
	libraryTarget: 'window'
    },
};
