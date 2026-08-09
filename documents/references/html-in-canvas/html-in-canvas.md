# HTML-in-Canvas

This is a proposal for using 2D and 3D `<canvas>` to customize the rendering of HTML content.

## Status

This is a living explainer which is continuously updated as we receive feedback.

The APIs described here are implemented behind a flag in Chromium and can be enabled with `chrome://flags/#canvas-draw-element`.

## Motivation

There is no web API to easily render complex layouts of text and other content into a `<canvas>`. As a result, `<canvas>`-based content suffers in accessibility, internationalization, performance, and quality.

### Use cases

- **Styled, Laid Out Content in Canvas.** There’s a strong need for better styled text support in Canvas. Examples include chart components (legend, axes, etc.), rich content boxes in creative tools, and in-game menus.
- **Accessibility Improvements.** There is currently no guarantee that the canvas fallback content used for `<canvas>` accessibility always matches the rendered content, and such fallback content can be hard to generate. With this API, elements drawn into the canvas will match their corresponding canvas fallback.
- **Composing HTML Elements with Effects.** A limited set of CSS effects, such as filters, backdrop-filter, and mix-blend-mode are already available, but there is a desire to use general WebGL shaders with HTML.
- **HTML Rendering in a 3D Context.** 3D aspects of sites and games need to render rich 2D content into surfaces within a 3D scene.
- **Media Export.** There's a need to export HTML content as images or video.

## Proposed solution

The solution introduces three main primitives: an attribute to opt-in canvas elements, methods to draw child elements into the canvas, and an event which fires to handle updates.

### 1. The `layoutsubtree` attribute

The `layoutsubtree` attribute on a `<canvas>` element opts in canvas descendants to layout and participate in hit testing. It causes the direct children of the `<canvas>` to have a stacking context, become a containing block for all descendants, and have paint containment. Canvas element children behave as if they are visible, but their rendering is not visible to the user unless and until they are explicitly drawn into the canvas via a call to `drawElementImage()` (see below).

### 2. `drawElementImage` (and WebGL/WebGPU equivalents)

The `drawElementImage()` method draws a child of the canvas into the canvas, and returns a transform that can be applied to `element.style.transform` to align its DOM location with its drawn location. A snapshot of the rendering of all children of the canvas is recorded just prior to the `paint` event. When called during the `paint` event, `drawElementImage()` will draw the child as it would appear in the current frame. When called outside the `paint` event, the previous frame's snapshot is used. An exception is thrown if `drawElementImage()` is called with a child before an initial snapshot has been recorded.

**Requirements & Constraints:**

- `layoutsubtree` must be specified on the `<canvas>` in the most recent rendering update.
- The `element` must be a direct child of the `<canvas>` in the most recent rendering update.
- The `element` must have generated boxes (i.e., not `display: none`) in the most recent rendering update.
- **Transforms:** The canvas's current transformation matrix is applied when drawing into the canvas. CSS transforms on the source `element` are **ignored** for drawing (but continue to affect hit testing/accessibility, see below).
- **Clipping:** Overflowing content (both layout and ink overflow) is clipped to the element's border box.
- **Sizing:** The optional `width`/`height` arguments specify a destination rect in canvas coordinates. If omitted, the `width`/`height` arguments default to sizing the element so that it has the same on-screen size and proportion in canvas coordinates as it does outside the canvas.

**WebGL/WebGPU Support:**
Similar methods are added for 3D contexts: `WebGLRenderingContext.texElementImage2D` and `copyElementImageToTexture`.

### 3. The `paint` event

A `paint` event is added to `canvas` elements and fires if the rendering of any canvas children has changed. This event fires just after intersection observer steps have run during [update-the-rendering](https://html.spec.whatwg.org/#update-the-rendering). The event contains a list of the canvas children which have changed. Because CSS transforms on canvas children are ignored for rendering, changing the transform does not cause the `paint` event to fire in the next frame. Canvas drawing commands made in the `paint` event will appear in the current frame, but DOM changes made in the `paint` event will not show up until the subsequent frame.

To support application patterns which update every frame, a new `requestPaint()` function is added which will cause the `paint` event to fire once, even if no children have changed (analagous to `requestAnimationFrame()`).

### 4. `captureElementImage`

To support `OffscreenCanvas` in workers, a snapshot of an element can be captured as an `ElementImage` snapshot using `canvas.captureElementImage(element)`. These objects can be transferred to a worker and drawn to an `OffscreenCanvas`.

### Synchronization

Browser features like hit testing, intersection observer, and accessibility rely on an element's DOM location. To ensure these work, the element's `transform` property should be updated so that the DOM location matches the drawn location.

<details>
<summary>Calculating a CSS transform to match a drawn location</summary>
  The general formula for the CSS transform is:

  <div align="center">$$T_{\text{origin}}^{-1} \cdot S_{\text{css} \to \text{grid}}^{-1} \cdot T_{\text{draw}} \cdot S_{\text{css} \to \text{grid}} \cdot T_{\text{origin}} $$</div>

Where:

- $$T_{\text{draw}}$$: Transform used to draw the element in the canvas grid coordinate system.
  For `drawElementImage`, this is $$CTM \cdot T_{(\text{x}, \text{y})} \cdot S_{(\text{destScale})}$$, where $$CTM$$ is the Current Transformation Matrix, $$T_{(\text{x}, \text{y})}$$ is a translation from the x and y arguments, and $$S_{(\text{destScale})}$$ is a scale from the width and height arguments.
- $$T_{\text{origin}}$$: Translation matrix of the element's computed `transform-origin`.
- $$S_{\text{css} \to \text{grid}}$$: Scaling matrix converting CSS pixels to Canvas Grid pixels.
</details>

To assist with synchronization, `drawElementImage()` returns the CSS transform which can be applied to the element to keep its location synchronized. For 3D contexts, the `getElementTransform(element, drawTransform)` helper method is provided which returns the CSS transform, provided a general transformation matrix.

The transform used to draw the element on the worker thread needs to be synced back to the DOM, and can simply be `postMessage()`'d back to the main thread if the position is static. If the position is dynamic, an alternative is to calculate the position on the main thread and update `element.style.transform` at the same time that the `ElementImage` objects is sent to the worker thread.

### Basic Example

<img width="250" height="38" alt="a screenshot showing a form element with a blinking cursor" src="https://github.com/user-attachments/assets/acbdd231-3259-4819-b57e-32e29c460fc9" />

```html
<canvas id="canvas" style="width: 400px; height: 200px;" layoutsubtree>
  <form id="form_element">
    <label for="name">name:</label>
    <input id="name" />
  </form>
</canvas>

<script>
  const ctx = document.getElementById("canvas").getContext("2d");

  canvas.onpaint = () => {
    ctx.reset();
    const transform = ctx.drawElementImage(form_element, 100, 0);
    form_element.style.transform = transform.toString();
  };

  // Size the canvas grid to match the device scale factor to prevent blurriness.
  const observer = new ResizeObserver(([entry]) => {
    canvas.width = entry.devicePixelContentBoxSize[0].inlineSize;
    canvas.height = entry.devicePixelContentBoxSize[0].blockSize;
  });
  observer.observe(canvas, { box: "device-pixel-content-box" });
</script>
```

### OffscreenCanvas Example

In this example, `OffscreenCanvas` in a worker is used. The `canvas` child form is captured as an `ElementImage` object in the `paint` event and transferred to the worker for painting.

```html
<!DOCTYPE html>
<canvas id="canvas" style="width: 400px; height: 200px;" layoutsubtree>
  <form id="form_element">
    <label for="name">name:</label>
    <input id="name" />
  </form>
</canvas>
<script>
  const workerCode = `
    let ctx;
    self.onmessage = (e) => {
      if (e.data.canvas) {
        ctx = e.data.canvas.getContext('2d');
      }
      if (e.data.width && e.data.height) {
        ctx.canvas.width = e.data.width;
        ctx.canvas.height = e.data.height;
      }
      if (e.data.elementImage) {
        ctx.reset();
        const transform = ctx.drawElementImage(e.data.elementImage, 100, 0);
        self.postMessage({transform: transform});
      }
    };
  `;

  const worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
  const offscreen = canvas.transferControlToOffscreen();

  worker.postMessage({ canvas: offscreen }, [offscreen]);

  canvas.onpaint = (event) => {
    const elementImage = canvas.captureElementImage(form_element);
    worker.postMessage({ elementImage: elementImage }, [elementImage]);
  };

  // Synchronize the element's CSS transform to match its drawn location.
  worker.onmessage = ({ data }) => {
    form_element.style.transform = data.transform.toString();
  };

  // Size the canvas grid to match the device scale factor to prevent blurriness.
  const observer = new ResizeObserver(([entry]) => {
    worker.postMessage({
      width: entry.devicePixelContentBoxSize[0].inlineSize,
      height: entry.devicePixelContentBoxSize[0].blockSize,
    });
    canvas.requestPaint();
  });
  observer.observe(canvas, { box: "device-pixel-content-box" });
</script>
```

### IDL changes

```idl
partial interface HTMLCanvasElement {
  [CEReactions, Reflect] attribute boolean layoutSubtree;

  attribute EventHandler onpaint;

  void requestPaint();

  ElementImage captureElementImage(Element element);
  DOMMatrix getElementTransform((Element or ElementImage) element, DOMMatrix drawTransform);
};

partial interface OffscreenCanvas {
  DOMMatrix getElementTransform((Element or ElementImage) element, DOMMatrix drawTransform);
};

interface mixin CanvasDrawElementImage {
  DOMMatrix drawElementImage((Element or ElementImage) element,
                             unrestricted double dx, unrestricted double dy);

  DOMMatrix drawElementImage((Element or ElementImage) element,
                             unrestricted double dx, unrestricted double dy,
                             unrestricted double dwidth, unrestricted double dheight);

  DOMMatrix drawElementImage((Element or ElementImage) element,
                             unrestricted double sx, unrestricted double sy,
                             unrestricted double swidth, unrestricted double sheight,
                             unrestricted double dx, unrestricted double dy);

  DOMMatrix drawElementImage((Element or ElementImage) element,
                             unrestricted double sx, unrestricted double sy,
                             unrestricted double swidth, unrestricted double sheight,
                             unrestricted double dx, unrestricted double dy,
                             unrestricted double dwidth, unrestricted double dheight);
};

CanvasRenderingContext2D includes CanvasDrawElementImage;
OffscreenCanvasRenderingContext2D includes CanvasDrawElementImage;

dictionary WebGLCopyElementImageConfig {
  GLfloat sx;
  GLfloat sy;
  GLfloat swidth;
  GLfloat sheight;
  GLsizei width;
  GLsizei height;
};

partial interface WebGLRenderingContext {
  void texElementImage2D(GLenum target, GLenum internalformat,
                         (Element or ElementImage) element,
                         optional WebGLCopyElementImageConfig config = {});
};

dictionary GPUCopyElementImageDestination {
  required GPUImageCopyTextureTagged destination;
  GPUIntegerCoordinate width;
  GPUIntegerCoordinate height;
};

dictionary GPUCopyElementImageSource {
  required (Element or ElementImage) source;
  float sx;
  float sy;
  float swidth;
  float sheight;
};

partial interface GPUQueue {
  void copyElementImageToTexture(GPUCopyElementImageSource source,
                                 GPUCopyElementImageDestination destination);
}

[Exposed=Window]
interface PaintEvent : Event {
  constructor(DOMString type, optional PaintEventInit eventInitDict);

  readonly attribute FrozenArray<Element> changedElements;
};

dictionary PaintEventInit : EventInit {
  sequence<Element> changedElements = [];
};

[Exposed=(Window,Worker), Transferable]
interface ElementImage {
  readonly attribute double width;
  readonly attribute double height;
  undefined close();
};
```

## Demos

#### [Live demo](https://wicg.github.io/html-in-canvas/Examples/complex-text.html) ([source](Examples/complex-text.html)) using the `drawElementImage` API to draw rotated complex text.

<img width="640" height="320" alt="screenshot showing rotated, complex text drawn into canvas" src="https://github.com/user-attachments/assets/3ef73e0f-9119-49de-bf84-dfb3a4f5d77c" />

#### [Live demo](https://wicg.github.io/html-in-canvas/Examples/pie-chart.html) ([source](Examples/pie-chart.html)) using the `drawElementImage` API to draw a pie chart with multi-line labels.

<img width="640" height="320" alt="screenshot showing a pie chart" src="https://github.com/user-attachments/assets/887eefa2-ffc0-49d6-914b-987b05ccb45d" />

#### [Live demo](https://wicg.github.io/html-in-canvas/Examples/webgpu-jelly-slider/) ([source](Examples/webgpu-jelly-slider)) using the WebGPU `copyElementImageToTexture` API to draw a div under a jelly slider.

<img width="640" height="320" alt="screenshot showing a range slider with a jelly effect" src="https://github.com/user-attachments/assets/86ecb8b8-4d3b-49b0-8aa0-5f2df5674045" />

#### [Live demo](https://wicg.github.io/html-in-canvas/Examples/webGL.html) ([source](Examples/webGL.html)) using the WebGL `texElementImage2D` API to draw HTML onto a 3D cube.

<img width="640" height="320" alt="screenshot showing html content on a 3D cube" src="https://github.com/user-attachments/assets/689fefe3-56d9-4ae9-b386-32a01ebb0117" />

A demo of the same thing using an experimental extension of [three.js](https://threejs.org/) is [here](https://raw.githack.com/mrdoob/three.js/htmltexture/examples/webgl_materials_texture_html.html). Further instructions and context are [here](https://github.com/mrdoob/three.js/pull/31233).

#### [Live demo](https://wicg.github.io/html-in-canvas/Examples/text-input.html) ([source](Examples/text-input.html)) of interactive content in canvas.

<img width="640" height="320" alt="screenshot showing a form drawn into canvas" src="https://github.com/user-attachments/assets/be2d098f-17ae-4982-a0f9-a069e3c2d1d5" />

## Privacy-preserving painting

The `drawElementImage()` method and any other methods that draw element image snapshots, as well as the paint event, must not reveal any security- or privacy-sensitive information that isn't otherwise observable to author code.

Both painting (via canvas pixel readbacks or timing attacks) and invalidation (via `onpaint`) have the potential to leak sensitive information, and this is prevented by excluding sensitive information when painting and invalidating.

Sensitive information includes:

- Cross-origin data in [embedded content](https://html.spec.whatwg.org/#embedded-content-category) (e.g., `<iframe>`, `<img>`), [`<url>`](https://drafts.csswg.org/css-values-4/#url-value) references (e.g., `background-image`, `clip-path`), `<canvas>` elements tained with cross-origin data, and [SVG](https://svgwg.org/svg2-draft/single-page.html#types-InterfaceSVGURIReference) (e.g., `<use>`, `<pattern>`, `<feImage>`). Note that same-origin iframes would still paint, but cross-origin content in them would not.
- System colors, themes, or preferences.
- Spelling and grammar markers.
- Visited link information.
- Pending form autofill information not otherwise available to JavaScript.
- Subpixel text anti-aliasing.
- User preferences for caption and subtitle selection and appearance.

The following new information is not considered sensitive:

- Search text (find-in-page) and text-fragment (fragment url) markers.
- Scrollbar and form element appearance (these are already detectable in Blink and WebKit through [foreignObject](https://jsfiddle.net/progers/qhawnyeu)).
- Caret blink rate.
- forced-colors (this information is already available to javascript using the `forced-colors` media query and system colors).

## Developer Trial (dev trial) Information

The HTML-in-Canvas features may be enabled with `chrome://flags/#canvas-draw-element` in Chrome Canary.

We are most interested in feedback on the following topics:

- What content works, and what fails? Which failure modes are most important to fix?
- How does the feature interact with accessibility features? How can accessibility support be improved?

Please file bugs or design issues [here](https://github.com/WICG/html-in-canvas/issues/new).

## Alternatives considered: `paint` event timing

A new `paint` event is needed to give developers an opportunity to update their canvas rendering in response to paint changes. This is integrated into [update the rendering](https://html.spec.whatwg.org/#update-the-rendering) so that canvas updates can occur in sync with the DOM.

There are several opportunities in the [update the rendering](https://html.spec.whatwg.org/#update-the-rendering) steps where the `paint` event could fire:

- 14\. Run animation frame callbacks.

- 16.2.1\. Recalculate styles and update layout.

- 16.2.6\. Deliver resize observers, looping back to 16.2.1 if needed.

- _Option A: Fire `paint` at resize observer timing, looping back to 16.2.1 if needed._

- 19\. Run the update intersection observations steps.

- Paint, where the painted output of elements is calculated. This is not an explicitly named step in [update the rendering](https://html.spec.whatwg.org/#update-the-rendering).

- _Option B: Fire `paint` immediately after Paint, looping back to 16.2.1 if needed._

- _Option C: Fire `paint` immediately after Paint._

- Commit / thread handoff, where the painted output is sent to another process. This is not an explicitly named step in [update the rendering](https://html.spec.whatwg.org/#update-the-rendering).

Note that the `paint` event is the new event on canvas introduced in this proposal, and the Paint step is the existing operation that browsers perform to record the painted output of the rendering tree following [paint order](https://drafts.csswg.org/css-position-4/#painting-order).

#### Option A: Fire `paint` at resize observer timing, looping back to 16.2.1 if needed.

Similar to resize observer, a looping approach is needed to handle cases where the paint event performs modifications (including of elements outside the canvas). There is no mechanism for preventing arbitrary javascript from modifying the DOM. Looping will be required for more conditions than those required by ResizeObserver, such as background style changes. A downside of looping is that the user's canvas code may need to run multiple times per frame.

One option is to do a synchronous Paint step to snapshot the painted output of canvas children. A downside of this approach is that the Paint step may be expensive to run, and may need to be run multiple times. This approach has unique implementation challenges in Gecko, and possibly other engines, due to architectural limitations.

A second option is to not run the Paint step synchronously, but instead record a placeholder representing how an element will appear on the next rendering update (see [design](https://docs.google.com/document/d/1YaHCxYqE4uQc4-UTWo4a5pHt2I2MutlwJtsnj5ljEkM/edit?usp=sharing)). This model can be implemented with 2D canvas by buffering the canvas commands until the next Paint step. When the next Paint step occurs, the placeholders would then be replaced with the actual rendering. Canvas operations such as `getImageData` require synchronous flushing of the canvas command buffer and would need to show blank or stale data for the placeholders. Unfortunately, this approach has a fundamental flaw for WebGL because many APIs require flushing (e.g., `getError()`, see callsites of [WaitForCmd](https://source.chromium.org/chromium/chromium/src/+/main:gpu/command_buffer/client/implementation_base.h;drc=b3eab4fd06ddbeee84b37224f4cc9d78094fc2f7;l=102)), and calling any of these APIs would result in a deadlock or inconsistent rendering. Therefore, we must run the `paint` event at a time where we have the complete painted display list of an element already available.

#### Option B: Fire `paint` immediately after Paint, looping back to 16.2.1 if needed.

See above for the reasons and downsides of looping when there are modifications made during the `paint` event.

The upside of option B as compared with option A is that it does not require partial Paint of canvas children. An additional downside is that even more steps of [update the rendering](https://html.spec.whatwg.org/#update-the-rendering) need to run on each iteration of the loop.

#### Option C: Fire `paint` immediately after Paint.

This is the design approach taken for the API.

This approach only runs `paint` once per frame, similar to the browser's own Paint step. To solve the issue of javascript being able to perform arbitrary modifications, it is important to ensure that before `paint` runs we have locked in the contents of the rendering update, except for one intentional carve-out: the drawn content of the canvas. DOM invalidations that may occur in the `paint` event apply to the subsequent frame, not the current frame.

## Alternatives considered: Supporting threaded effects with worker threads

To support threaded effects, we explored a [design](https://docs.google.com/document/d/1TWe6HP7HMn6y-XnNKppIhgf9FtuXJ6LPgenJJxZDjzg/edit?tab=t.0) where canvas children "snapshots" are sent to a worker thread. In response to threaded scrolling and animations, the worker thread could then render the most up-to-date rendering of the snapshots into OffscreenCanvas. This model requires that javascript can be synchronously called on scroll and animation updates, which is difficult for architectures that perform threaded scroll updates in a restricted process.

## Future considerations: Supporting threaded effects with an auto-updating canvas

To support threaded effects such as scrolling and animations, we are considering a future "auto-updating canvas" mode.

In this model, `drawElementImage` records a placeholder representing the latest rendering. Canvas retains a command buffer which can be automatically replayed following every scroll or animation update. This allows the canvas to re-rasterize with updated placeholders that incorporate threaded scrolling and animations, without needing to block on script. This would enable visual effects that stay perfectly in sync with native scrolling or animations within the canvas, independent of the main thread. This design is viable for 2D contexts, and may be viable for WebGPU with some small API additions.

## Other documents

- [Security and Privacy Questionnaire](./security-privacy-questionnaire.md)

## Authors

- [Philip Rogers](mailto:pdr@chromium.org)
- [Stephen Chenney](mailto:schenney@igalia.com)
- [Chris Harrelson](mailto:chrishtr@chromium.org)
- [Philip Jägenstedt](mailto:foolip@chromium.org)
- [Khushal Sagar](mailto:khushalsagar@chromium.org)
- [Vladimir Levin](mailto:vmpstr@chromium.org)
- [Fernando Serboncini](mailto:fserb@chromium.org)

![Thomas Nattestad](https://web.dev/images/authors/nattestad.jpg) Thomas Nattestad [X](https://twitter.com/fractorious) ![Natalia Markoborodova](https://web.dev/images/authors/nmarkoborodova.jpg) Natalia Markoborodova [X](https://twitter.com/nmarkoborodova) [GitHub](https://github.com/ewewraw) [LinkedIn](https://www.linkedin.com/in/natalia-markoborodova) [Bluesky](https://bsky.app/profile/nmarkoborodova.bsky.social)

<br />

For years, web developers have had to make a tough architectural choice when building complex, highly-interactive visual applications on the web/ Should you lean on the DOM for its rich semantic features or render directly to the `<canvas>` element for low-level graphics performance?

With the new experimental [**HTML-in-Canvas API**](https://github.com/WICG/html-in-canvas/)---available now [in origin trial](https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849)---you don't have to choose. This API lets you draw DOM content directly into a 2D canvas or a WebGL/WebGPU texture while keeping the UI interactable, accessible, and hooked up to your favorite browser features. By combining HTML with low-level graphics processing, you can create experiences that were previously impossible.
[Video](https://www.youtube.com/watch?v=TUtKGTeFWjQ)

## The DOM versus Canvas

To understand the power of this new API, it helps to look at the relative strengths of both the DOM and the Canvas.

[The DOM](https://developer.mozilla.org/docs/Web/API/Document_Object_Model) is the staple of web UI. It offers text layout solutions out of the box, using semantically understood content to create rich interfaces. This lets users perform common operations across web pages seamlessly---things we often take for granted, like highlighting text to copy, or right-clicking an image to save it. The DOM also integrates with essential browser features: accessibility tools, translate, find-in-page, reader mode, extensions, dark mode, browser zoom, and autofill.

[Canvas](https://developer.mozilla.org/docs/Web/API/Canvas_API) (and [WebGL](https://developer.mozilla.org/docs/Web/API/WebGL_API)/[WebGPU](https://developer.mozilla.org/docs/Web/API/WebGPU_API)), on the other hand, allows for low-level access to drive a grid of pixels for highly advanced 2D and 3D graphics. Games and complex web apps (like Google Docs or Figma) require this performant, low-level access. Because the canvas is fundamentally a grid of pixels, supporting features like responsive text used to require complex custom UI logic, drastically increasing your bundle size. Crucially, all the powerful browser features integrated into the DOM break completely when the UI is trapped inside a static canvas pixel grid.

## The advantages of bringing the DOM to Canvas

The HTML-in-Canvas API is the bridge that gives you the best of both worlds. By placing HTML inside the `<canvas>` element and synchronizing its transform, you ensure the content remains fully interactive, and that all browser integrations function automatically.

Here's what you get by letting the DOM handle your UI inside a `<canvas>` element:

- **Text layout and formatting**: Simplified text layout and formatting, including multiline or bidirectional text with CSS styles applied.
- **Form controls**: Expressive and easier to use form controls with extensive customization options.
- **Text selection, copy/paste, and right-click**: Users can highlight text inside your 3D scenes, or right-click context menus natively.
- **Accessibility**: Content rendered inside the canvas is exposed to the accessibility tree. Accessibility systems can parse the UI as they do normal HTML, and expose it to systems like screen readers.
- **Find-in-page** : Users can use find-in-page (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>F</kbd>) to search for text, and the browser highlights it directly within your WebGL textures.
- **Indexability and AI agent interfaceable**: Web crawlers and AI agents can seamlessly index and read the text rendered into your 2D and 3D scenes.
- **Extension integration**: Browser extensions work natively. For example, a text-replacement extension automatically updates the text rendered on your 3D meshes.
- **DevTools integration**: You can inspect your canvas content, including for WebGL/WebGPU UI elements directly in Chrome DevTools. Tweak a CSS style in the inspector, and watch it instantly update on the 3D texture!

## High-level use cases

This API unlocks incredible potential across several domains:

- **Large canvas-based applications**: Heavyweight web apps like Google Docs, Miro, or Figma can now render complex application UI components natively into their canvas-driven workspaces, improving accessibility and reducing bundle weight.
- **3D scenes and games**: Marketing sites, immersive WebXR experiences, and web games can now place fully interactable web UI into 3D scenes---like a 3D book that uses real DOM text, or an in-game terminal that natively supports copying and pasting.

## How to use the API

> [!NOTE]
> **Note:** As of Chrome 148 through 150, the HTML-in-Canvas API is in an early development stage, and the implementation details might change. Join our [developer newsletter mailing list](https://groups.google.com/g/html-in-canvas-developer-newsletter) to stay up-to-date with the latest announcements.

Using the API happens in three phases: Setting up your canvas, rendering into the canvas, and updating the CSS transform so the browser knows where the element physically sits on the screen.

### Prerequisites

The HTML-in-Canvas API is in origin trial in Chrome 148 through 150. To test it on your site, use Chrome Canary 149 or later with the `chrome://flags/#canvas-draw-element` flag enabled. To enable the API for other users, register for [the Origin Trial](https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849).

### Step 1: Basic Canvas setup

First, add the `layoutsubtree` attribute to your `<canvas>` tag. This makes the browser aware of the content nested inside the canvas, preparing it to be displayed inside the canvas, and exposing it to accessibility trees.

    <canvas id="canvas" style="width: 200px; height: 200px;" layoutsubtree>
      <div id="form_element">
        <label for="name">Name:</label> <input id="name" type="text">
      </div>
    </canvas>

#### Size the canvas grid

To avoid blurriness of the rendered content, make sure to size the canvas grid to match the device scale factor.

    const observer = new ResizeObserver(([entry]) => {
      const dpc = entry.devicePixelContentBoxSize;
      canvas.width = dpc ? dpc[0].inlineSize : Math.round(entry.contentRect.width * window.devicePixelRatio);
      canvas.height = dpc ? dpc[0].blockSize : Math.round(entry.contentRect.height * window.devicePixelRatio);
    });

    const supportsDevicePixelContentBox =
      typeof ResizeObserverEntry !== 'undefined' &&
      'devicePixelContentBoxSize' in ResizeObserverEntry.prototype;
    const options = supportsDevicePixelContentBox ? { box: 'device-pixel-content-box' } : {};
    observer.observe(canvas, options);

### Step 2: Rendering

For a 2D context, use the `drawElementImage` method. Do this inside the `paint` event, which triggers whenever the element redraws---for example, during text highlighting or user input. It's crucial to update the element's CSS transform with the return value so interactivity continues to work.

    const ctx = document.getElementById('canvas').getContext('2d');
    const form_element = document.getElementById('form_element');
    const canvas = document.getElementById('canvas');

    canvas.onpaint = () => {
      ctx.reset();

      // Draw the form element at x:0, y:0
      let transform = ctx.drawElementImage(form_element, 0, 0);

      // Use the transform returned later on...
    };

#### Render with WebGL

For WebGL, you use `texElementImage2D`. It functions similar to `texImage2D`, but takes the DOM element as the source.

    canvas.onpaint = () => {
      if (gl.texElementImage2D) {
        gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, form_element);
      }
    };

#### Render with WebGPU

WebGPU uses the `copyElementImageToTexture` method on the device queue, analogous to `copyExternalImageToTexture`:

    canvas.onpaint = () => {
      root.device.queue.copyElementImageToTexture(
        valueElement,
        { texture: targetTexture }
      );
    };

### Step 3: Update the CSS transform

Now that you've rendered the element into the canvas, you have to update the browser on where it's located. This ensures spatial synchronization between the canvas and the DOM's layout. This is important so that the browser can correctly map the event zone---such where exactly the user clicks or hovers---with where the element is rendered.

For the 2D context case, apply the transform returned by the rendering call to the `.style.transform property`:

    const ctx = document.getElementById('canvas').getContext('2d');
    const form_element = document.getElementById('form_element');
    const canvas = document.getElementById('canvas');

    canvas.onpaint = () => {
      ctx.reset();
      // Draw the form element at x:0, y:0
      let transform = ctx.drawElementImage(form_element, 0, 0);

      // Sync the DOM location with the drawn location
      form_element.style.transform = transform.toString();
    };

With WebGL or WebGPU, the on-screen location of an element depends on how the output texture is used by shader code, and can't be deduced from the canvas rendering context. However, if your shader program uses a typical model view projection to draw the texture, then you can use the new convenience function `element.getElementTransform()` to compute a transform that can be used in the same way as the return value from `drawElementImage()`. To facilitate this, you need to do the following:

- **Convert WebGL [MVP Matrix](https://developer.mozilla.org/docs/Web/API/WebGL_API/WebGL_model_view_projection#the_model_view_and_projection_matrices) to [DOM Matrix](https://developer.mozilla.org/docs/Web/API/DOMMatrix).**
- **Normalize the HTML element.** HTML elements are sized in pixels (for example, 200px wide). WebGL, however, usually treats objects as "unit squares", for example, ranging from 0 to 1. If you don't normalize, your 200px button will look 200 times larger.
- **Map to the canvas viewport.** This step is the "rescaling" phase. It stretches that unit-space math back out to match the actual pixel dimensions of your `<canvas>` element on the screen. It also flips the Y-axis, because in WebGL, up is positive, but in CSS, down is positive.
- **Calculate the final transform.** Multiply the matrices in order: `Viewport * MVP * Normalization.` Combining them into one final transform produces a "map" that tells the browser exactly where that HTML element layer should sit to align with the 3D drawing.
- **Apply the transform to the HTML element.** This moves the HTML element layer to sit directly on top of its rendered pixels. This ensures that when a user clicks a button or selects text, they're hitting the real HTML element.

  if (canvas.getElementTransform) {
  // 1. Convert WebGL MVP Matrix to DOM Matrix
  const mvpDOM = new DOMMatrix(Array.from(htmlElementMVP));

      // 2. Normalize the HTML element (pixels -> 1x1 unit square)
      const width = targetHTMLElement.offsetWidth;
      const height = targetHTMLElement.offsetHeight;

      const cssToUnitSpace = new DOMMatrix()
        .scale(1 / width, -1 / height, 1) // Shrink to unit size and flip Y
        .translate(-width / 2, -height / 2); // Center the element

      // 3. Map to the canvas viewport
      const clipToCanvasViewport = new DOMMatrix()
        .translate(canvas.width / 2, canvas.height / 2) // Move origin to center
        .scale(canvas.width / 2, -canvas.height / 2, 1); // Stretch to canvas dimensions

      // 4. Multiply: (Clip -> Pixels) * (MVP) * (pixels -> unit square)
      const screenSpaceTransform = clipToCanvasViewport
          .multiply(mvpDOM)
          .multiply(cssToUnitSpace);

      // 5. Apply to the transform
      const computedTransform = canvas.getElementTransform(targetHTMLElement, screenSpaceTransform);
      if (computedTransform) {
        targetHTMLElement.style.transform = computedTransform.toString();
      }

  }

## Library and framework support

Some of the popular libraries have already shipped support for the HTML-in-Canvas feature.

### Three.js

Updating matrixes manually can be tedious, which is why frameworks are already jumping on board. Three.js has [experimental support](https://github.com/mrdoob/three.js/pull/31233) using the new `THREE.HTMLTexture`:

    const material = new THREE.MeshBasicMaterial();
    material.map = new THREE.HTMLTexture(uiElement); // Pass the DOM element

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

### PlayCanvas

PlayCanvas also supports HTML-in-Canvas using their texture API:

    // Wait for the 'paint' event to set the source
    canvas.addEventListener('paint', () => {
        htmlTexture.setSource(htmlElement);
    }, { once: true });
    canvas.requestPaint();

    // Keep up to date
    canvas.addEventListener('paint', onPaintUpload);

    const material = new pc.StandardMaterial();
    material.diffuseMap = htmlTexture;
    material.update();

## Demos

Before trying out the demos, ensure your environment is
[properly configured](https://developer.chrome.com/blog/html-in-canvas-origin-trial#prerequisites).

There are [several demos](https://github.com/WICG/html-in-canvas/tree/main/Examples) that serve as a reference for using the API. We are already seeing creative solutions from the community, ranging from translatable 3D books to UI elements that refract through glass shaders:

- [The 3D book](https://chrome.dev/html-in-canvas/demos/webgl-book-curl.html): A WebGL-rendered 3D book that uses HTML layout for its pages. Users can swap fonts with CSS. Because it's DOM-based, built-in translation works instantly, and AI agents can extract the text with less complexity.
- [Interactive 3D UIs](https://wicg.github.io/html-in-canvas/Examples/webgpu-jelly-slider/): A WebGPU jelly slider that refracts light based on an underlying 3D model, while still responding to standard HTML `<input type="range">` step attributes.
- [Animated textures](https://chrome.dev/html-in-canvas/demos/billboard.html): A dynamic 3D billboard rendering an animated SVG pencil using the DOM directly into a WebGL texture without needing a custom animation loop.
- [Refractive overlays](https://chrome.dev/html-in-canvas/demos/fluid-prism-text.html): An interactive typography layer distorted by a moving 3D cursor, yet fully selectable and searchable using find-in-page.

Check out the [collection of demos](https://github.com/GoogleChromeLabs/css-web-ui-demos/blob/main/html-in-canvas/awesome-html-in-canvas.md) created by the community. If you'd like your HTML-in-Canvas demo to be featured in this collection, [create a pull request](https://github.com/GoogleChromeLabs/css-web-ui-demos/blob/main/CONTRIBUTING.md#add-a-demo-to-the-awesome-html-in-canvas-list) to add it.

## Limitations

While powerful, the API has a few conscious limitations:

- **Cross-origin content** : For [security and privacy reasons](https://github.com/WICG/html-in-canvas/tree/main?tab=readme-ov-file#privacy-preserving-painting), the API does not work with cross-origin iframe content.
- **Main thread scrolling**: HTML-in-canvas is drawn with JavaScript, which means that scrolling and animations cannot update independently of JavaScript, like they can outside canvas. Developers should carefully consider the performance characteristics of putting scrolling content inside canvas versus having the entire canvas scroll.

## Feedback

If you are experimenting with the HTML-in-Canvas API, we want to hear from you! You can sign up for the [origin trial](https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849) to enable the feature on your site while it's in the experimental phase to help us shape the API design. You can also [file an issue](https://github.com/WICG/html-in-canvas/issues) to provide any feedback.

## Resources

- [HTML-in-Canvas support in Three.js](https://threejs.org/docs/#HTMLTexture)
- [HTML-in-Canvas in Three.js demo](https://threejs.org/examples/webgl_materials_texture_html.html)
- [HTML-in-Canvas support in PlayCanvas: Developer documentation](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/html-in-canvas/)
- [HTML-in-Canvas in PlayCanvas demo](https://playcanvas.vercel.app/#/misc/html-texture)
- [HTML-in-Canvas: Explainer](https://github.com/WICG/html-in-canvas/blob/main/README.md)
- [Modern Web Guidance for AI coding tools for HTML-in-Canvas](https://github.com/GoogleChrome/guidance)
- [Chrome.dev demos for HTML-in-Canvas](https://chrome.dev/html-in-canvas/)
- [Awesome HTML-in-Canvas demo collection by the community](https://github.com/GoogleChromeLabs/css-web-ui-demos/blob/main/html-in-canvas/awesome-html-in-canvas.md)
