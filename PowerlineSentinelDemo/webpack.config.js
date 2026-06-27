const path = require('path')

const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')

module.exports = function (env) {
  return {
    entry: [
      './assets/js/app.js',
      './assets/sass/style.scss'
    ],
    output: {
      path: path.join(__dirname, './dist/'),
      filename: 'bundle.js',
      publicPath: '.'
    },
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader'
          }
        },
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true
              }
            }
          ]
        },
        {
          test: /\.(svg|gif|png|jpe?g)$/i,
          exclude: [/fonts/],
          loader: 'file-loader?name=/img/[name].[ext]'
        },
        {
          test: /\.(eot|svg|ttf|woff|woff2)$/,
          exclude: [/img/],
          loader: 'file-loader?name=/fonts/[name].[ext]'
        }
      ]
    },

    plugins: [
      new MiniCssExtractPlugin({
        filename: 'bundle.css'
      }),
      new OptimizeCssAssetsPlugin({
        cssProcessorOptions: {
          map: {
            inline: false,
            annotation: true
          }
        }
      })
    ]
  }
}
