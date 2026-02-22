
<div class="container">
    <h3 class="h2 mb-3 w-100 d-flex align-items-center justify-content-between">
    Choose Course
    <a href="<?=base_url('app/course/my_course')?>" class="btn btn-myred" 
      >Back</a>
    </h3>
    <?php 
    if(!empty($enrolled_courses)){
        foreach($enrolled_courses as $course){ ?>
            <a href="<?=base_url('app/course/switch_course/'.$course['id'])?>">
              <div class="card rounded-4 shadow course-list-a">
                    <div class="card-body py-2 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <img src="<?= $course['course_icon']?>" class="avatar-md" alt="">
                            <div class="ms-3 pt-3 ">
                                <h3 class="fw-bold h4"><?=$course['title']?></h3>
                            </div>
                        </div>
                        <div >
                            <i class=" ri-arrow-right-s-line " style="font-size: 2.5rem;"></i>
                        </div>
                    </div>
                </div>  
            </a>
    <?php } }else{ ?>
        
    <?php } ?>
</div>
    