import React from "react";
import Highcharts from "highcharts/highstock";
import "bootstrap/dist/css/bootstrap.min.css";
import StockChart from "./components/Stock.jsx";
import Chart from "./components/Chart.jsx";
import axios from "axios";
import socketIOClient from "socket.io-client";

require("highcharts/indicators/indicators")(Highcharts);
require("highcharts/indicators/pivot-points")(Highcharts);
require("highcharts/indicators/macd")(Highcharts);
require("highcharts/modules/exporting")(Highcharts);
require("highcharts/modules/map")(Highcharts);
const ENDPOINT = "http://kaboom.rksv.net/watch";
class App extends React.Component {
  state = {
    hdata: [],
    volume: [],
    ldata: null,
    lvolume: null,
  };
  async componentDidMount() {
    const ldata2 = localStorage.getItem("ldata");
    if (ldata2) {
      const ldata = JSON.parse(ldata2);
      const lvolume = JSON.parse(localStorage.getItem("lvolume"));
      this.setState({ ldata: ldata, lvolume: lvolume });
    }
    await axios
      .get("http://kaboom.rksv.net/api/historical?interval=9")
      .then((res) => {
        const hdata = res.data.sort();
        var ohlc = [];
        var volume = [];
        var dataLength = hdata.length;
        for (var i = 0; i < dataLength; i += 1) {
          var dataArr = hdata[i].split(",");
          ohlc.push([
            parseFloat(dataArr[0]),
            parseFloat(dataArr[1]),
            parseFloat(dataArr[2]),
            parseFloat(dataArr[3]),
            parseFloat(dataArr[4]),
          ]);

          volume.push([
            parseFloat(dataArr[0]), // the date
            parseFloat(dataArr[5]), // the volume
          ]);
        }

        this.setState({ hdata: ohlc, volume: volume });
        localStorage.setItem("hdata", JSON.stringify(ohlc));
        localStorage.setItem("hvolume", JSON.stringify(volume));
      })
      .catch((error) => {
        const ohlc = JSON.parse(localStorage.getItem("hdata"));
        const hvolume = JSON.parse(localStorage.getItem("hvolume"));
        this.setState({ hdata: ohlc, volume: hvolume });
      });
  }
  render() {
    const groupingUnits = [
      [
        "week", // unit name
        [1], // allowed multiples
      ],
      ["month", [1, 2, 3, 4, 6]],
    ];
    const stockOptions = {
      title: {
        text: "Historical",
      },

      yAxis: [
        {
          labels: {
            align: "right",
            x: -3,
          },
          title: {
            text: "OHLC",
          },
          height: "60%",
          lineWidth: 2,
          resize: {
            enabled: true,
          },
        },
        {
          labels: {
            align: "right",
            x: -3,
          },
          title: {
            text: "Volume",
          },
          top: "65%",
          height: "35%",
          offset: 0,
          lineWidth: 2,
        },
      ],
      tooltip: {
        split: true,
      },
      series: [
        {
          type: "candlestick",
          name: "AAPL",
          id: "aapl",
          zIndex: 2,
          data: this.state.hdata,
          dataGrouping: {
            units: groupingUnits,
          },
        },
        {
          type: "column",
          name: "Volume",
          id: "volume",
          data: this.state.volume,
          yAxis: 1,
          dataGrouping: {
            units: groupingUnits,
          },
        },
      ],
    };

    const socket = socketIOClient(ENDPOINT);
    socket.emit("sub", { state: true });
    var lohlc = [];
    var lvolume = [];
    const stockLiveOptions = {
      chart: {
        events: {
          load: function () {
            var series = this.series[0];
            var series1 = this.series[1];

            socket.on("data", function (ldata, ack) {
              console.log(ldata);

              var ldataArr = ldata.split(",");
              var loh = [
                parseFloat(ldataArr[0]),
                parseFloat(ldataArr[1]),
                parseFloat(ldataArr[2]),
                parseFloat(ldataArr[3]),
                parseFloat(ldataArr[4]),
              ];
              lohlc.push(loh);

              var lv = [
                parseFloat(ldataArr[0]), // the date
                parseFloat(ldataArr[5]), // the volume
              ];
              lvolume.push(lv);
              localStorage.setItem("ldata", JSON.stringify(lohlc));
              localStorage.setItem("lvolume", JSON.stringify(lvolume));
              series.addPoint(loh, true, true);
              series1.addPoint(lv, true, true);
              if (ack) {
                ack(1);
              }
            });
          },
        },
      },
      time: {
        useUTC: false,
      },

      rangeSelector: {
        buttons: [
          {
            count: 1,
            type: "minute",
            text: "1M",
          },
          {
            count: 5,
            type: "minute",
            text: "5M",
          },
          {
            type: "all",
            text: "All",
          },
        ],
        inputEnabled: false,
        selected: 0,
      },

      title: {
        text: "Live",
      },

      yAxis: [
        {
          labels: {
            align: "right",
            x: -3,
          },
          title: {
            text: "OHLC",
          },
          height: "60%",
          lineWidth: 2,
          resize: {
            enabled: true,
          },
        },
        {
          labels: {
            align: "right",
            x: -3,
          },
          title: {
            text: "Volume",
          },
          top: "65%",
          height: "35%",
          offset: 0,
          lineWidth: 2,
        },
      ],

      tooltip: {
        split: true,
      },
      xAxis: [
        {
          labels: {
            formatter: function () {
              return Highcharts.dateFormat("%H:%M:%S", this.value);
            },
          },
        },
      ],
      series: [
        {
          type: "spline",
          name: "AAPL",
          data: this.state.ldata,
          dataGrouping: {
            units: groupingUnits,
          },
        },
        {
          type: "column",
          name: "Volume",
          data: this.state.lvolume,
          yAxis: 1,
          dataGrouping: {
            units: groupingUnits,
          },
        },
      ],
    };
    return (
      <div className="container">
        <div className="card">
          <div className="card-body">
            <div className="card-title">
              <div className="title">Historical Data</div>
              <StockChart options={stockOptions} highcharts={Highcharts} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="card-title">Live Chart</div>
            <Chart options={stockLiveOptions} highcharts={Highcharts}></Chart>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
