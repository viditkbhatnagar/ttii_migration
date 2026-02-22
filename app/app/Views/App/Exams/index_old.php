<div class="container mt-4">
  <h3 class="h2 mb-3 w-100 d-flex align-items-center justify-content-between">
    Exams
    <a href="<?=base_url('app/course/my_course')?>" class="btn btn-myred" 
      >Back</a>
  </h3>
  <?php if (!empty($exams)) { ?>
    <?php foreach ($exams as $exam) { ?>
  
    <a href="#">
        <div class="card rounded-4 shadow course-list-a">
          <div class="card-body py-2 d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center">
                  <div class="ms-3 ">
                      <h3 class="fw-bold h4 mb-0"><?= $exam['title'] ?></h3>
                  </div>
              </div>
              <div >
                  <i class=" ri-arrow-right-s-line " style="font-size: 2.5rem;"></i>
              </div>
          </div>
      </div>
    </a>
    
        <?php } ?>
    <?php } ?>
</div>

