<div class="row">
<div class="col-md-4">
  <div class="bannerarea mb-4">
    <img src="./assets/livevideoimg.jpg" alt="" class="img-fluid" />
    <div
      class="d-flex align-items-center justify-content-between p-2 mt-2"
    >
      <div>
        <h4 class="mb-1"><?= $course_details['title']?></h4>
        <p><?= $course_details['short_description']?></p>
      </div>
      <div class="mb-3">
        <button class="btn btn-success px-2 py-1">
          <i class="fs-3 bx bxl-whatsapp"></i>
        </button>
        <button class="btn btn-primary px-2 py-1">
          <i class="fs-3 bx bxs-phone-call"></i>
        </button>
      </div>
    </div>
    <div class="d-flex align-items-center justify-content-between">
      <div class="w-50 p-1">
        <a href="<?=base_url('app/plans/index/'.$course_details['id'])?>" class="btn btn-warning w-100 fs-5">Buy NOW</a>
      </div>
      <div class="w-50 p-1">
        <a href="<?=base_url('app/course/my_course')?>" class="btn btn-myred w-100 fs-5">View Course</a>
      </div>
    </div>
  </div>
</div>
<div class="col-md-8 px-md-5">
  <div class="aboutsection">
    <h3>About</h3>
    <p class="" style="text-align: justify">
      <?= $course_details['description']?>
    </p>
  </div>
  <div class="Courseincludesection">
    <h3>Course Includes</h3>
    <ul
      class="d-flex flex-wrap align-items-center justify-content-around"
    >
      <li class="course-item">
        <i class="text-warning fs-1 ri-live-fill"></i>
        <span class="fs-4">Live Classes</span>
      </li>
      <li class="course-item">
        <i class="text-warning fs-1 ri-video-fill"></i>
        <span class="fs-4">Video Classes</span>
      </li>
      <li class="course-item">
        <i class="text-warning fs-1 ri-book-2-fill"></i>
        <span class="fs-4">Study Material</span>
      </li>
      <li class="course-item">
        <i class="text-warning fs-1 bx bxs-chat"></i>
        <span class="fs-4">Doubt Solving</span>
      </li>
    </ul>
  </div>
  <div class="Whatweprovide">
    <h3>What We Provide</h3>
    <div class="row mt-3">
      <div class="col-md-6">
          <h3 class="h5"> <i class="ri-time-fill text-success  fs-4"></i> Lifetime Access</h3>
          <p>
            Buy once and access till whenever you want. <br> No holding your learning back.
          </p>
      </div>
      <div class="col-md-6">
          <h3 class="h5"> <i class="ri-play-circle-fill text-info fs-4"></i> <?=count($subjects)?> Lessons</h3>
          <p>
            <?=count($subjects)?> Learning lectures
          </p>
      </div>
    </div>
  </div>
</div>
</div>
