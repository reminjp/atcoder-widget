(() => {
  const WIDGET_NAME = 'AtCoder Widget';
  const WIDGET_URL = 'https://github.com/rdrgn/atcoder-widget';

  const COLORS = ['#000000', '#808080', '#804000', '#008000', '#00C0C0', '#0000FF', '#C0C000', '#FF8000', '#FF0000'];
  const THRESHOLDS = [0, 400, 800, 1200, 1600, 2000, 2400, 2800, 1e5];
  const PADDING_TOP = 34;
  const PADDING_BOTTOM = 10;
  const PADDING_LEFT = 10;
  const PADDING_RIGHT = 10;
  const MARKER_RADIUS = 4;
  const MARKER_STROKE_WIDTH = 1;
  const LINE_STROKE_WIDTH = 2;
  const HEADER_MARGIN = 10;

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

      this.width = this.root.clientWidth;
      this.height = this.root.clientHeight;

      this.container = document.createElement('div');
      this.container.setAttribute(
        'style',
        'position:relative;width:100%;height:100%;background-color:#ffffff;color:#9e9e9e;font-size:10px;'
      );
      this.root.appendChild(this.container);

      this.header = document.createElement('div');
      this.header.setAttribute('style', `position:absolute;top:${HEADER_MARGIN}px;left:${HEADER_MARGIN}px;`);
      this.header.innerHTML = `<span style="font-weight:bold;">${this.user}</span>`;
      this.container.appendChild(this.header);

      this.footer = document.createElement('div');
      this.footer.setAttribute('style', `position:absolute;top:${HEADER_MARGIN}px;right:${HEADER_MARGIN}px;`);
      this.footer.innerHTML = `<a href="${WIDGET_URL}" style="color:inherit;text-decoration:none;">${WIDGET_NAME}</a>`;
      this.container.appendChild(this.footer);

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
        this.history = request.response;
        this.history = this.history.filter(e => e.IsRated);

        let xMin = new Date().getTime();
        let xMax = 0;
        let yMin = 1e5;
        let yMax = 0;
        const points = this.history
          .map(e => {
            const x = new Date(e.EndTime).getTime();
            const y = e.NewRating;
            if (x < xMin) xMin = x;
            if (x > xMax) xMax = x;
            if (y < yMin) yMin = y;
            if (y > yMax) yMax = y;
            return [x, y];
          })
          .map(([x, y]) => [
            ((x - xMin) / (xMax - xMin)) * (this.width - PADDING_LEFT - PADDING_RIGHT) + PADDING_LEFT,
            ((yMax - y) / (yMax - yMin)) * (this.height - PADDING_TOP - PADDING_BOTTOM) + PADDING_TOP,
          ]);
        const thresholdYs = THRESHOLDS.map(
          e => ((yMax - e) / (yMax - yMin)) * (this.height - PADDING_TOP - PADDING_BOTTOM) + PADDING_TOP
        );

        const currentRationg =
          this.history[this.history.length - 1].NewRating || this.history[this.history.length - 1].OldRating;
        const currentRatingColor = COLORS[THRESHOLDS.findIndex(e => currentRationg < e)];
        const highestRating = this.history.reduce((max, e) => Math.max(max, e.NewRating), 0);
        const highestRatingColor = COLORS[THRESHOLDS.findIndex(e => highestRating < e)];

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
          line.setAttributeNS(null, 'stroke-width', String(LINE_STROKE_WIDTH));
          line.setAttributeNS(null, 'stroke', '#9e9e9e');
          svg.appendChild(line);
          this.svgLines.push(line);
        }

        this.svgMarkers = [];
        for (let i = 0; i < points.length; i++) {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttributeNS(null, 'cx', String(points[i][0]));
          circle.setAttributeNS(null, 'cy', String(points[i][1]));
          circle.setAttributeNS(null, 'r', String(MARKER_RADIUS));
          circle.setAttributeNS(null, 'stroke-width', String(MARKER_STROKE_WIDTH));
          circle.setAttributeNS(null, 'stroke', '#ffffff');
          circle.setAttributeNS(null, 'fill', COLORS[THRESHOLDS.findIndex(e => this.history[i].NewRating < e)]);
          svg.appendChild(circle);
          this.svgMarkers.push(circle);
        }
      };

      // TODO: detect the 'resize' of `this.root`
      window.addEventListener('resize', this.onResize);
    }

    public dispose() {
      if (this.root && this.container) {
        this.root.removeChild(this.container);
      }
      this.root = null;

      window.removeEventListener('resize', this.onResize);
    }

    public onResize() {
      this.width = this.root.clientWidth;
      this.height = this.root.clientHeight;

      let xMin = new Date().getTime();
      let xMax = 0;
      let yMin = 1e5;
      let yMax = 0;
      const points = this.history
        .map(e => {
          const x = new Date(e.EndTime).getTime();
          const y = e.NewRating;
          if (x < xMin) xMin = x;
          if (x > xMax) xMax = x;
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
          return [x, y];
        })
        .map(([x, y]) => [
          ((x - xMin) / (xMax - xMin)) * (this.width - PADDING_LEFT - PADDING_RIGHT) + PADDING_LEFT,
          ((yMax - y) / (yMax - yMin)) * (this.height - PADDING_TOP - PADDING_BOTTOM) + PADDING_TOP,
        ]);
      const thresholdYs = THRESHOLDS.map(
        e => ((yMax - e) / (yMax - yMin)) * (this.height - PADDING_TOP - PADDING_BOTTOM) + PADDING_TOP
      );

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

  // main
  const root = document.currentScript.parentElement;
  const user = root.getAttribute('user');
  new Widget(root, user);
})();
