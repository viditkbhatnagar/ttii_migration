<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Instuctions</title>
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
    body{
        background-color: #ffdbe4;
    }

    main {
        display: flex;
        flex-direction: column;
        justify-content: flex-end; /* Align items to the bottom */
        max-width: 500px;
        min-height: 100vh; /* Full viewport height */
        background-color: #ffdbe4;
        background-image: url(<?=base_url(get_file('uploads/quiz/instruction_img.png'))?>);
        background-repeat: no-repeat;
        background-position: top center; /* 30vh from the top and horizontally centered */
        background-size: auto; /* Keep the original size of the image */
    }

    .instruction_container {
        border-top-left-radius: 43px;
        border-top-right-radius: 43px;
        min-height: 70vh;
        background-color: white;
        /* Ensure that the container has enough space for content */
    }

    .myinstructiondiv{
        min-height: 45vh;
    }
    .instruction-text{
        font-size: 1.2rem;
    }

    @media screen and (max-height: 750px) {
        .instruction-text{
        font-size: 1rem;
    }
    }
    .btn-primary:hover,.btn-primary{
        background-image: linear-gradient(180deg, #A40DEE, #940CD6);
        border: 0;
    }
    
    </style>
  </head>
  <body>
    <main class="mx-auto">
      <div class=" bg-white instruction_container">
        <div class="container py-5">
          <div class="row">
            <div class="col-12">
              <div class="row pt-4 mt-1 px-2">
                <div class="col-2"> <!--empty div placed here for design purpose--> </div>
                <div class="col-8"><h3 class="h3 text-center fw-bold">Instructions</h3></div>
                <!--<div class="col-2"><img src="<?//=base_url(get_file('uploads/quiz/cross_icon.png'))?>" alt="cross"></div>-->
              </div>
            </div>
            <div class="col-12 myinstructiondiv">
                <div class="row px-3 mt-3">
                    <?php if($instructions!=NULL) { foreach($instructions as $instruction) { ?>
                        <div class="col-12 my-1">
                            <div class="row">
                                <div class="col-2"><img src="<?=base_url(get_file('uploads/quiz/check-box.png'))?>" class="img-fluid mt-2 " alt=""></div>
                                <div class="col-10"><p class="instruction-text"><?=$instruction?></p></div>
                            </div>
                        </div>
                    <?php } } else { ?>
                        <div class="col-12 my-1">
                            <div class="row">
                                <div class="col-2"><img src="<?=base_url(get_file('uploads/quiz/check-box.png'))?>" class="img-fluid mt-2 " alt=""></div>
                                <div class="col-10">
                                    <ul CLASS="instruction-text">
                                        <li>4 marks for each correct answer and negative 1 for each incorrect answer.</li>
                                        <li>You can skip questions if you do not want to attend.</li>
                                        <li>In last question you can finish quiz after confirmation.</li>
                                        <li>If time expired the quiz will get automatically submitted without confirmation.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    <?php } ?>
                </div>
            </div>
            <div class="col-12">
                <div class="d-flex align-items-center justify-content-center mt-4">
                    <?php if($questions > 0) { ?>
                        <a href="<?=base_url('quiz/start_quiz/'.$user_id.'/'.$exam_id)?>" class="btn btn-primary btn-lg px-5" >Start Quiz</a>
                    <?php } else { ?>
                        <a  class="btn btn-danger btn-lg px-5" >Please Add Questions</a>
                    <?php } ?>
                </div>
            </div>
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
