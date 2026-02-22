
<div class="row px-md-5">
    <div class="col-md-4">
        <div class="bannerarea mb-4">
            <img src="<?=base_url(get_file($course_details['thumbnail']))?>" alt="" class="rounded-4 img-fluid">
            <h3 class="h3 mt-2"></h3>
            <h3 class="h3 mt-2"><?= $course_details['title'] ?></h3>
        </div>
    </div>
    <div class="col-md-8">
        
        <?php foreach($packages['packages'] as $package){ ?>
        <?php $url = $package['type'] == 2 ? base_url('app/plans/plan_details/'.$course_id.'/'.$package['id']) : '#' ?>
        
            <a href="<?=$url?>">
                <div class="card rounded-4 shadow plan-card">
                    <div class="card-body py-2 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            
                            <div class="ms-3 pt-3">
                                <h3 class="fw-bold h4"><?=$package['title']?></h3>
                                <?php if($package['type'] == 1){ ?>
                                    <p><?=$package['price_text']?></p>
                                <?php } ?>
                                <?=$package['description']?>
                            </div>
                        </div>
                        <div>
                            <i class="ri-arrow-right-s-line" style="font-size: 2.5rem;"></i>
                        </div>
                    </div>
                </div>
            </a>
        <?php } ?>
            
    </div>
</div>
