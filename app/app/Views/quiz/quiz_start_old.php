<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Exams</title>
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
      integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA=="
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
    />
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
      rel="stylesheet"
      integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
      crossorigin="anonymous"
    />

    <style>
      * {
        padding: 0;
        margin: 0;
      }
      body {
        background-color: #830abe;
      }
      main {
        max-width: 500px;
        margin-inline: auto;
      }
      .my-minheight {
        min-height: 60vh;
      }
      
      .correct-answer {
        background-color: #1EC297 !important;
        color: #fff;
        position: relative;
      }

      .wrong-answer {
        background-color: #F2443E !important;
        color: #fff;
        position: relative;
      }

      .correct-answer::after, .wrong-answer::after {
        font-family: "Font Awesome 6 Free";
        font-weight: 900;
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
      }

      .correct-answer::after {
        content: "\f00c"; /* Font Awesome tick icon */
      }

      .wrong-answer::after {
        content: "\f00d"; /* Font Awesome cross icon */
      }

      @keyframes progress {
        0% { --percentage: 0; }
        100% { --percentage: var(--value); }
      }

      .progress-bar-custom {
        --percentage: var(--value);
        --primary: #01DCD2;
        --secondary: #fff;
        --size: 150px; /* Smaller size */
        animation: progress 2s 0.5s forwards;
        width: var(--size);
        aspect-ratio: 2 / 1;
        border-radius: 50% / 100% 100% 0 0;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }

      .progress-bar-custom::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: conic-gradient(from 0.75turn at 50% 100%, var(--primary) calc(var(--percentage) * 1% / 2), var(--secondary) calc(var(--percentage) * 1% / 2 + 0.1%));
        mask: radial-gradient(at 50% 100%, white 55%, transparent 55.5%);
        mask-mode: alpha;
        -webkit-mask: radial-gradient(at 50% 100%, #0000 55%, #000 55.5%);
        -webkit-mask-mode: alpha;
      }

      .progress-bar-custom::after {
        counter-reset: percentage var(--value);
        content: counter(percentage) ' s';
        font-family: Helvetica, Arial, sans-serif;
        font-size: 1.8rem; /* Font size adjusted */
        color: var(--secondary);
        position: absolute;
        bottom: -8px; /* Moved text downwards */
      }

      
      .option {
        transition: all 0.3s ease;
        cursor: pointer;
        background-color: #fff;
        position: relative;
        overflow: hidden;
        border-radius: 8px; /* Smooth rounded corners */
        z-index: 1;
      }
    
      .option:hover {
        background-color: #f8f4ff;
        outline: 1px solid #A40DEE;
        color: #A40DEE;
      }
    
      .option:active {
        transform: scale(0.98);
        background-color: #e4d8ff;
      }
    
      .option::before {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        background: rgba(164, 13, 238, 0.4); /* Subtle purple color for ripple */
        transform: translate(-50%, -50%) scale(3);
        border-radius: 50%;
        opacity: 0;
        z-index: 0;
        transition: all 0.5s ease;
      }
    
      .option:active::before {
        width: 300px; /* Increase the width for ripple effect */
        height: 300px; /* Increase the height for ripple effect */
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.2);
      }
    
      .option:after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 8px;
        box-shadow: 0 0 15px rgba(164, 13, 238, 0.6);
        opacity: 0;
        transition: opacity 0.5s ease;
      }
    
      .option:active:after {
        opacity: 1;
      }
    
      .option span {
        position: relative;
        z-index: 1;
      }
      .bg-mylight{
        background-color: #ebebeb;
      }

      a{
        text-decoration: none;
        color: #000;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="container pt-5">
        <div class="question-progress-section">
          <div class="row">
            <div class="col-2">
              <span class="text-white">1/20</span>
            </div>
            <div class="col-8">
              <div
                class="progress mt-2"
                role="progressbar"
                aria-valuenow="25"
                aria-valuemin="0"
                aria-valuemax="100"
                style="height: 12px"
              >
                <div class="progress-bar bg-warning" style="width: 25%"></div>
              </div>
            </div>
            <div class="col-2"><img src="<?=base_url(get_file('uploads/quiz/cross_icon.png'))?>" class="img-fluid w-50" alt=""></div>
          </div>
        </div>
        <div class="time-progress d-flex justify-content-center mt-4 py-4">
          <div role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style="--value: 50" class="progress-bar-custom"></div>
        </div>
        <div class="mt-4 mb-2">
          <div class="bg-mylight my-minheight rounded-4 px-3 pt-4">
            <div class="question-number">
              <span class="fs-1 text-muted fw-bold">
                Q.1
              </span>
            </div>
            <div class="question my-3">
              <span class="fs-4 fw-bold">What is the synonym of "happy"?</span>
            </div>
            <div class="options-div">
              <a href="#">
                
                <div class="option  rounded-4 px-4 py-3 py-md-4 my-3 fs-6">Joyful</div>
              </a>
              <a href="./exam2.html">
                
                <div class="option  rounded-4 px-4 py-3 py-md-4 my-3 fs-6">Content</div>
              </a>
              <a href="./exam2.html">
                
                <div class="option  rounded-4 px-4 py-3 py-md-4 my-3 fs-6">Sad</div>
              </a>
              <a href="./exam2.html">
                <div class="option  rounded-4 px-4 py-3 py-md-4 my-3 fs-6">Elated</div>
                
              </a>
            </div>
            <br>
          </div>
        </div>
      </div>
    </main>
    <script
      src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
      integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
      crossorigin="anonymous"
    ></script>
  </body>
</html>
