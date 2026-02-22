<div class="container mt-4">
    <h3 class="h2 mb-3 w-100 d-flex align-items-center justify-content-between">
        Live classes
        <a href="<?=base_url('app/course/my_course')?>" class="btn btn-myred">Back</a>
    </h3>
    <?php if (!empty($live_classes)) { 
            foreach ($live_classes as $live) { ?>
                <a href="<?= ($live['status'] == 'Live Now' && $live['free'] == 'on') ? base_url("app/live/index/{$live['id']}/{$user_id}") : 'javascript:void(0);'?>">
                    <div class="card rounded-4 shadow course-list-a bg-myinfo-subtle">
                      <div class="card-body py-2 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                          <img src="<?=base_url('assets/app/images/live_class.png')?>" class="rounded-circle" alt="" style="width: 100px" />
                          <div class="ms-3">
                            <h3 class="fw-bold h4"><?= $live['title'] ?></h3>
                            <p class="my-0"><?= $live['course_name'] ?></p>
                            <p class="my-0"><?= $live['date'] ?></p>
                            <p class="my-0"><?= $live['time'] ?></p>
                          </div>
                        </div>
                        <div class="" style="margin-top: -24px; margin-right: -20px;">
                            <div class="badge text-bg-light text-muted fs-4" >
                                <?= $live['status'] ?>
                            </div>
                            <?php if($live['free'] != 'on'){ ?>
                                <div class="d-flex align-items-center justify-content-end pe-5">
                                    <i class="ri-lock-line" style="font-size: 2.5rem; color: #f00;"></i>
                                </div>
                            <?php }else{ ?>
                                <div class="d-flex align-items-center justify-content-end pe-5">
                                    <i class=" ri-arrow-right-s-line " style="font-size: 2.5rem;"></i>
                                </div>
                            <?php } ?>
                        </div>
                      </div>
                    </div>
                </a>
    <?php   } 
        } else { ?>
  
        <div class="card rounded-4 shadow course-list-a bg-myinfo-subtle">
            <div class="card-body py-2 d-flex align-items-center justify-content-between">
                No live classes.
            </div>
        </div>
  
  <?php } ?>
</div>
    