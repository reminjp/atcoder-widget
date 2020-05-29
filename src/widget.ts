interface Array<T> {
  findIndex(predicate: (value: T, index: number, obj: Array<T>) => boolean, thisArg?: any): number;
}

(() => {
  const WIDGET_NAME = 'AtCoder Widget';
  const WIDGET_URL = 'https://github.com/rdrgn/atcoder-widget';

  const MIN_WIDTH = 100;
  const MIN_HEIGHT = 100;

  // const COLORS = ['#000000', '#808080', '#804000', '#008000', '#00C0C0', '#0000FF', '#C0C000', '#FF8000', '#FF0000'];
  const COLORS = ['#000000', '#9e9e9e', '#795548', '#558b2f', '#00b8d4', '#2962ff', '#f9c025', '#ef6c00', '#d50000'];
  const THRESHOLDS = [0, 400, 800, 1200, 1600, 2000, 2400, 2800, 1e5];
  const RADIUS = 4;
  const STROKE_WIDTH = 2;
  const PADDING = 16;

  class Widget {
    private user: string;
    private root: HTMLElement = null;
    private width: number;
    private height: number;
    private history: {
      IsRated: boolean;
      Place: number;
      OldRating: number;
      NewRating: number;
      Performance: number;
      InnerPerformance: number;
      ContestScreenName: string;
      ContestName: string;
      EndTime: string;
    }[] = [];
    private isAvailable: boolean = false;
    private container: HTMLDivElement = null;
    private header: HTMLDivElement = null;
    private footer: HTMLDivElement = null;
    private svgBackgrounds: SVGRectElement[];
    private svgMarkers: SVGCircleElement[];
    private svgLines: SVGLineElement[];

    constructor(root: HTMLElement, user: string) {
      this.root = root;
      this.user = user;
      this.onResize = this.onResize.bind(this);

      if (!root) {
        console.error(`${WIDGET_NAME}: Invalid root element`);
        return;
      }

      if (!/^[0-9A-Za-z_]+$/.test(this.user)) {
        console.error(`${WIDGET_NAME}: Invalid user`);
        return;
      }

      this.width = Math.max(MIN_WIDTH, this.root.clientWidth);
      this.height = Math.max(MIN_HEIGHT, this.root.clientHeight);

      this.container = document.createElement('div');
      this.container.style.setProperty('position', 'relative');
      this.container.style.setProperty('width', '100%');
      this.container.style.setProperty('height', '100%');
      this.container.style.setProperty('background-color', '#f5f5f5');
      this.container.style.setProperty('color', '#212121');
      this.container.style.setProperty('font-size', '10px');
      this.root.appendChild(this.container);

      this.header = document.createElement('div');
      this.header.style.setProperty('position', 'absolute');
      this.header.style.setProperty('top', `${PADDING / 2}px`);
      this.header.style.setProperty('left', `${PADDING / 2}px`);
      this.container.appendChild(this.header);
      {
        const headerInner = document.createElement('span');
        headerInner.style.setProperty('font-weight', 'bold');
        headerInner.innerHTML = this.user;
        this.header.appendChild(headerInner);
      }

      this.footer = document.createElement('div');
      this.footer.style.setProperty('position', 'absolute');
      this.footer.style.setProperty('bottom', `${PADDING / 2}px`);
      this.footer.style.setProperty('right', `${PADDING / 2}px`);
      this.container.appendChild(this.footer);
      {
        const footerInner = document.createElement('a');
        footerInner.href = WIDGET_URL;
        footerInner.style.setProperty('color', 'inherit');
        footerInner.style.setProperty('text-decoration', 'none');
        footerInner.innerHTML = WIDGET_NAME;
        this.footer.appendChild(footerInner);
      }

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttributeNS(null, 'version', '1.1');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      svg.setAttribute('style', 'width:100%;height:100%;');
      this.container.appendChild(svg);

      const request = new XMLHttpRequest();
      request.open(
        'GET',
        `https://cors-anywhere.herokuapp.com/https://atcoder.jp/users/${this.user}/history/json`,
        true
      );
      request.responseType = 'json';
      request.send();
      request.onload = () => {
        this.history = request.response || [];
        this.history = this.history.filter((e) => e.IsRated);

        if (this.history.length < 2) {
          console.error(`${WIDGET_NAME}: Rated results are fewer than 2`);
          return;
        }

        this.width = Math.max(MIN_WIDTH, this.root.clientWidth);
        this.height = Math.max(MIN_HEIGHT, this.root.clientHeight);

        let xMin = new Date().getTime();
        let xMax = 0;
        let yMin = 1e5;
        let yMax = 0;
        const points = this.history
          .map((e) => {
            const x = new Date(e.EndTime).getTime();
            const y = e.NewRating;
            if (x < xMin) xMin = x;
            if (x > xMax) xMax = x;
            if (y < yMin) yMin = y;
            if (y > yMax) yMax = y;
            return [x, y];
          })
          .map(([x, y]) => [
            ((x - xMin) / (xMax - xMin)) * (this.width - 2 * PADDING) + PADDING,
            ((yMax - y) / (yMax - yMin)) * (this.height - 2 * PADDING) + PADDING,
          ]);
        const thresholdYs = THRESHOLDS.map((e) => ((yMax - e) / (yMax - yMin)) * (this.height - 2 * PADDING) + PADDING);

        const currentRationg =
          this.history[this.history.length - 1].NewRating || this.history[this.history.length - 1].OldRating;
        const currentRatingColor = COLORS[THRESHOLDS.findIndex((e) => currentRationg < e)];
        const highestRating = this.history.reduce((max, e) => Math.max(max, e.NewRating), 0);
        const highestRatingColor = COLORS[THRESHOLDS.findIndex((e) => highestRating < e)];

        this.header.innerHTML = `<a href="https://atcoder.jp/users/${this.user}" style="color:${currentRatingColor};text-decoration:none;font-weight:bold;">${this.user}</a> Current <span style="color:${currentRatingColor};">${currentRationg}</span> Highest <span style="color:${highestRatingColor};">${highestRating}</span>`;

        this.svgBackgrounds = [];
        for (let i = 0; i + 1 < thresholdYs.length; i++) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttributeNS(null, 'x', '0');
          rect.setAttributeNS(null, 'y', String(thresholdYs[i + 1]));
          rect.setAttributeNS(null, 'width', String(this.width));
          rect.setAttributeNS(null, 'height', String(thresholdYs[i] - thresholdYs[i + 1]));
          rect.setAttributeNS(null, 'fill', COLORS[i + 1]);
          rect.setAttributeNS(null, 'fill-opacity', '0.2');
          svg.appendChild(rect);
          this.svgBackgrounds.push(rect);
        }

        this.svgLines = [];
        for (let i = 0; i + 1 < points.length; i++) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttributeNS(null, 'x1', String(points[i][0]));
          line.setAttributeNS(null, 'y1', String(points[i][1]));
          line.setAttributeNS(null, 'x2', String(points[i + 1][0]));
          line.setAttributeNS(null, 'y2', String(points[i + 1][1]));
          line.setAttributeNS(null, 'stroke-width', String(STROKE_WIDTH));
          line.setAttributeNS(null, 'stroke', '#212121');
          svg.appendChild(line);
          this.svgLines.push(line);
        }

        this.svgMarkers = [];
        for (let i = 0; i < points.length; i++) {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttributeNS(null, 'cx', String(points[i][0]));
          circle.setAttributeNS(null, 'cy', String(points[i][1]));
          circle.setAttributeNS(null, 'r', String(RADIUS));
          circle.setAttributeNS(null, 'stroke-width', String(STROKE_WIDTH));
          circle.setAttributeNS(null, 'stroke', '#212121');
          circle.setAttributeNS(null, 'fill', COLORS[THRESHOLDS.findIndex((e) => this.history[i].NewRating < e)]);
          svg.appendChild(circle);
          this.svgMarkers.push(circle);
        }

        this.container.style.setProperty('background-color', '#ffffff');

        this.isAvailable = true;
      };

      // TODO: detect the 'resize' of `this.root`
      window.addEventListener('resize', this.onResize);
    }

    public dispose() {
      if (!this.isAvailable) return;
      this.isAvailable = false;

      if (this.root && this.container) this.root.removeChild(this.container);
      this.root = null;

      window.removeEventListener('resize', this.onResize);
    }

    public onResize() {
      if (!this.isAvailable) return;

      this.width = Math.max(MIN_WIDTH, this.root.clientWidth);
      this.height = Math.max(MIN_HEIGHT, this.root.clientHeight);

      let xMin = new Date().getTime();
      let xMax = 0;
      let yMin = 1e5;
      let yMax = 0;
      const points = this.history
        .map((e) => {
          const x = new Date(e.EndTime).getTime();
          const y = e.NewRating;
          if (x < xMin) xMin = x;
          if (x > xMax) xMax = x;
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
          return [x, y];
        })
        .map(([x, y]) => [
          ((x - xMin) / (xMax - xMin)) * (this.width - 2 * PADDING) + PADDING,
          ((yMax - y) / (yMax - yMin)) * (this.height - 2 * PADDING) + PADDING,
        ]);
      const thresholdYs = THRESHOLDS.map((e) => ((yMax - e) / (yMax - yMin)) * (this.height - 2 * PADDING) + PADDING);

      for (let i = 0; i + 1 < thresholdYs.length; i++) {
        this.svgBackgrounds[i].setAttributeNS(null, 'y', String(thresholdYs[i + 1]));
        this.svgBackgrounds[i].setAttributeNS(null, 'width', String(this.width));
        this.svgBackgrounds[i].setAttributeNS(null, 'height', String(thresholdYs[i] - thresholdYs[i + 1]));
      }

      for (let i = 0; i + 1 < points.length; i++) {
        this.svgLines[i].setAttributeNS(null, 'x1', String(points[i][0]));
        this.svgLines[i].setAttributeNS(null, 'y1', String(points[i][1]));
        this.svgLines[i].setAttributeNS(null, 'x2', String(points[i + 1][0]));
        this.svgLines[i].setAttributeNS(null, 'y2', String(points[i + 1][1]));
      }

      for (let i = 0; i < points.length; i++) {
        this.svgMarkers[i].setAttributeNS(null, 'cx', String(points[i][0]));
        this.svgMarkers[i].setAttributeNS(null, 'cy', String(points[i][1]));
      }
    }
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
  // https://tc39.github.io/ecma262/#sec-array.prototype.findindex
  if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
      value: function (predicate) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }

        const o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        const len = o.length >>> 0;

        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        const thisArg = arguments[1];

        // 5. Let k be 0.
        let k = 0;

        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return k.
          const kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return k;
          }
          // e. Increase k by 1.
          k++;
        }

        // 7. Return -1.
        return -1;
      },
      configurable: true,
      writable: true,
    });
  }

  // main
  const root = document.currentScript.parentElement;
  const user = root.dataset.user;
  new Widget(root, user);
})();
