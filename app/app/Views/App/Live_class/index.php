<style>
    .mynavlink.active{
        background-color: #FB803D !important;
        border-radius: 45px;
    }
</style>
<div class="container-fluid">
    <!--<div class="card">-->
    <!--    <div class="card-body">-->
            <div class="row">
                <div class="col-12">
                    <ul class="nav nav-pills nav-success mb-3" role="tablist">
                        <li class="nav-item waves-effect waves-light">
                            <a class="nav-link mynavlink active" data-bs-toggle="tab" href="#current-1" role="tab">Current</a>
                        </li>
                        <li class="nav-item waves-effect waves-light">
                            <a class="nav-link mynavlink" data-bs-toggle="tab" href="#home-1" role="tab">Upcoming</a>
                        </li>
                        <li class="nav-item waves-effect waves-light">
                            <a class="nav-link mynavlink" data-bs-toggle="tab" href="#profile-1" role="tab">Completed</a>
                        </li>
                    </ul>
                    <!-- Tab panes -->
                    <div class="tab-content text-muted">
                        <div class="tab-pane active" id="current-1" role="tabpanel">
                            <?php if (!empty($current_live_classes)) { 
                                foreach ($current_live_classes as $live) { ?>
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
                                        No Current live classes.
                                    </div>
                                </div>
                            <?php } ?>
                        </div>
                        <div class="tab-pane" id="home-1" role="tabpanel">
                           <?php if (!empty($upcoming_live_classes)) { 
                                foreach ($upcoming_live_classes as $live) { ?>
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
                                        No Upcoming live classes.
                                    </div>
                                </div>
                            <?php } ?>
                        </div>
                        <div class="tab-pane" id="profile-1" role="tabpanel">
                            <?php if (!empty($upcoming_live_classes)) { 
                                foreach ($upcoming_live_classes as $live) { ?>
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
                                        No Upcoming live classes.
                                    </div>
                                </div>
                            <?php } ?>
                        </div>
                    </div>
                    <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/eventscard2.png" class="w-50 mb-3">-->
                    
                </div>
            </div>
    <!--    </div>-->
    <!--</div>-->
</div>