const path = require('path');
const pkg = require('./WBDPlanning.json')
const webpack = require('webpack')

module.exports = {
    mode: 'production', // or 'production' , 'development'
    entry: {
        WBDPlanning: './widgets/StoryWidget.js',
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    devServer: {
        static: {
            directory: path.join(__dirname, ''),
        },
        port: 3000,
    },
    plugins: [
        new webpack.BannerPlugin(
            {
                banner: `
          Name: ${pkg.name}
          Version: ${pkg.version}
          Author: Rohit Chouhan
          Linkedin: https://linkedin.com/in/itsrohitchouhan
          Copyright: © Deloitte [commercial use only]
        `
            }
        )
    ]
};
