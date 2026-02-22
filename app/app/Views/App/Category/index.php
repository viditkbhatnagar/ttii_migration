
<div class="row px-md-5">
    <div class="col-md-4">
        <div class="bannerarea mb-4">
            <img src="<?=base_url(get_file($category_data['thumbnail']))?>" alt="Category image" class="rounded-4 img-fluid">
            <h3 class="h3 mt-2"><?=$category_data['name'] ?></h3>
            <p>6 Students Enrolled</p>
        </div>
    </div>
    <div class="col-md-8 ">
        <?php 
        if (!empty($courses)) {
            foreach ($courses as $course) { ?>
                <a href="<?=base_url('app/details/index/'.$course['id'])?>">
                    <div class="card rounded-4 shadow course-list-a">
                        <div class="card-body py-2 d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center">
                                <?php if(!empty($course['course_icon'])){ ?>
                                <img src="<?= base_url(get_file($course['course_icon']))?>" class="avatar-md" alt="course icon">
                                <?php } else { ?>
                                <img src="https://www.kurin.com/wp-content/uploads/placeholder-square.jpg" class="avatar-md" alt="placeholder image">
                                <?php } ?>
                                <div class="ms-3 pt-3">
                                    <h3 class="fw-bold h4"><?=$course['title']?></h3>
                                    <p><?=$course['short_description']?></p>
                                </div>
                            </div>
                            <div>
                                <i class="ri-arrow-right-s-line" style="font-size: 2.5rem;"></i>
                            </div>
                        </div>
                    </div>  
                </a>
            <?php }
        } else { ?>
           <div class="card rounded-4 shadow course-list-a">
                        <div class="card-body py-2 d-flex align-items-center justify-content-center">
                            <span>No data available.</span>
                        </div>
                    </div>  
        <?php } ?>
    </div>
</div>
