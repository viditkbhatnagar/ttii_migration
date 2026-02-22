<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <link rel="stylesheet" href="<?=base_url('assets/practice/index.css')?>" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
      integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A=="
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
    />
    
    <style>
        @media(max-width:680px){
          .count_icon{
              display:none;
          } 
          .result_card_item{
              margin-top:90px;
          }
        }
        
    </style>
  </head>

  <body>
    <section class="section-area">

      <!-- next section -->

      <div class="result_ui ">
         <div class="result_ui_card">
            
              <div class="count_icon">
                <span><i class="fa-solid fa-arrow-left" onclick="goBackFun()"></i></span>
              </div>
             <div class="result_card_item">
                <div class="top_section">
                    <h3>No of Questions</h3>
                    <p>Select no of questions you need in exam</p>
                </div>
                <div class="bottom_section">
                    <div class="row">
                        <div class="card" data-number="5">
                            <h4>5</h4>
                        </div>
                        <div class="card" data-number="10">
                            <h4>10</h4>
                        </div>
                  
                        <div class="card" data-number="15">
                            <h4>15</h4>
                        </div>
                        <div class="card " data-number="20">
                            <h4>20</h4>
                        </div>
                    </div>
                </div>
                <div class="button_section">
                    <button onclick="handelSelectQuestianNumber()">Submit</button>
                </div>
             </div>
         </div>
      </div>
        
        

            
          


     

   
    </section>

   <script>
    document.addEventListener("DOMContentLoaded", function() {
      const cards = document.querySelectorAll(".card");
    
      cards.forEach(card => {
        card.addEventListener("click", function() {
          // Remove active_card class from all cards
          cards.forEach(c => c.classList.remove("active_card"));
          // Add active_card class to the clicked card
          card.classList.add("active_card");
        });
      });
    });




    function handelSelectQuestianNumber(){
        const cards = document.querySelectorAll(".card");
        let selectedNumber = null;
        
        cards.forEach(card => {
          if (card.classList.contains("active_card")) {
            selectedNumber = card.getAttribute("data-number");
          }
        });
        
        if(selectedNumber){
          // Assuming user_id and attempt_id are available in the JavaScript context
          const userId = '<?= $user_id ?>';
          const course_id = '<?= $course_id ?>';
          const attemptId = '<?= $attempt_id ?>';
        
          const baseUrl = '<?= base_url("exam/practice_web_view_new") ?>';
          const questionNo = selectedNumber;
          const targetUrl = `${baseUrl}/${userId}/${course_id}/?attempt_id=${attemptId}&question_no=${questionNo}`;
        
          console.log(targetUrl);
          window.location.href = targetUrl;
        
        }else{
          console.log('please select');
        }
    }

    function goBackFun() {
        window.location.href = "<?=base_url('exam/practice_web_view_new/'.$user_id.'/'.$course_id)?>";
      }

   </script>

  </body>
</html>
