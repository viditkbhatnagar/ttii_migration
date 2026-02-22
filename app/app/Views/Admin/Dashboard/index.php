    <!-- start page title -->
    <div class="row">
        <div class="col-12">
            <div class="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

                <div class="page-title-right">
                    <ol class="breadcrumb m-0">
                        <li class="breadcrumb-item"><a href="javascript: void(0);">Dashboards</a></li>
                        <!--<li class="breadcrumb-item active"><?//=$page_title ?? ''?></li>-->
                    </ol>
                </div>

            </div>
        </div>
    </div>
    <!-- end page title -->

    <div class="row h-100">
              <?php if(is_admin() || is_counsellor()) : ?>
              <div class="col-xl-4 col-md-6">
                <div class="dashboardminicard card">
                  <?php if(is_admin()) : ?>
                  <a href="<?=base_url('admin/course/index')?>"> 
                  <?php endif; ?>
                  <div class="card-body">
                    <div class="d-flex align-items-center">
                      <div class="avatar-sm flex-shrink-0">
                        <span
                          class="avatar-title bg-light text-success rounded-circle fs-3"
                        >
                          <i class="ri-booklet-line text-success"></i>
                        </span>
                      </div>
                      <div
                        class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center"
                      >
                        <h4 class="mb-0 fs-5">Courses</h4>
                        <span class="badge text-success fs-4"><?=$number_of_courses?></span>
                      </div>
                    </div>
                  </div></a>
                  <!-- end card body -->
                </div>
                <!-- end card -->
              </div>
              <!-- end col -->
               
             
              
              
              <div class="col-xl-4 col-md-6">
                <div class="dashboardminicard card">
                  <?php if(is_admin()) : ?>
                 <a href="<?=base_url('admin/centres/index')?>"> 
                  <?php endif; ?>
                 <div class="card-body">
                    <div class="d-flex align-items-center">
                      <div class="avatar-sm flex-shrink-0">
                        <span
                          class="avatar-title bg-light text-danger rounded-circle fs-3"
                        >
                            <i class="ri-school-line text-danger"></i>
                        </span>
                      </div>
                      <div
                        class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center"
                      >
                        <h4 class="mb-0 fs-5">Centers</h4>
                        <span class="badge text-danger fs-4"><?=$number_of_centres?></span>
                      </div>
                    </div>
                  </div></a>
                  <!-- end card body -->
                </div>
                <!-- end card -->
              </div>
              <!-- end col -->
              
              
              
              
              
              <div class="col-xl-4 col-md-6">
                <div class="dashboardminicard card">
                 <a href="<?=base_url('admin/students/index')?>"> <div class="card-body">
                    <div class="d-flex align-items-center">
                      <div class="avatar-sm flex-shrink-0">
                        <span
                          class="avatar-title bg-light text-primary rounded-circle fs-3"
                        >
                          <i class="ri-shield-user-line text-primary"></i>
                        </span>
                      </div>
                      <div
                        class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center"
                      >
                        <h4 class="mb-0 fs-5">Students</h4>
                        <span class="badge text-primary fs-4"><?=$number_of_students?></span>
                      </div>
                    </div>
                  </div></a>
                  <!-- end card body -->
                </div>
                <!-- end card -->
              </div>
              <!-- end col -->
              <div class="col-xl-3 col-md-6 d-none">
                <div class="dashboardminicard card">
                  <?php if(is_admin()) : ?>
                 <a href="<?=base_url('admin/instructor/index')?>"> 
                  <?php endif; ?>
                  <div class="card-body">
                    <div class="d-flex align-items-center">
                      <div class="avatar-sm flex-shrink-0">
                        <span
                          class="avatar-title bg-light text-info rounded-circle fs-3"
                        >
                          <i class="ri-user-voice-line text-info"></i>
                        </span>
                      </div>
                      <div
                        class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center"
                      >
                        <h4 class="mb-0 fs-5">Instructors</h4>
                        <span class="badge text-info fs-4"><?=$number_of_instructors?></span>
                      </div>
                    </div>
                  </div></a>
                  <!-- end card body -->
                </div>
                <!-- end card -->
              </div>
              <!-- end col -->
              

             <!-- ------------------------- -->
              <!-- end col -->
              <!-- <div class="col-xl-4 col-md-6">
                <div class="dashboardminicard card">
                 <a href="<?=base_url('admin/live_class/index')?>"> <div class="card-body">
                    <div class="d-flex align-items-center">
                      <div class="avatar-sm flex-shrink-0">
                        <span
                          class="avatar-title bg-light text-warning rounded-circle fs-3"
                        >
                          <i class="ri-mac-line text-warning"></i>
                        </span>
                      </div>
                      <div
                        class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center"
                      >
                        <h4 class="mb-0 fs-5">Live Classes</h4>
                        <span class="badge text-warning fs-4"><?=$number_of_live_class?></span>
                      </div>
                    </div>
                  </div></a> -->
                  <!-- end card body -->
                <!-- </div> -->
                <!-- end card -->
              <!-- </div> -->

              <!-- --------------- -->
               
              <div class="col-xl-4 col-md-6">
                <div class="dashboardminicard card">
                  <?php if(is_admin()) : ?>
                 <a href="<?=base_url('admin/enrol/index')?>">
                  <?php endif; ?>
                 <div class="card-body">
                    <div class="d-flex align-items-center">
                      <div class="avatar-sm flex-shrink-0">
                        <span
                          class="avatar-title bg-light text-success rounded-circle fs-3"
                        >
                          <i class="ri-css3-line text-success"></i>
                        </span>
                      </div>
                      <div
                        class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center"
                      >
                        <h4 class="mb-0 fs-5">Enrolments</h4>
                        <span class="badge text-success fs-4"><?=$number_of_enrolment?></span>
                      </div>
                    </div>
                  </div></a>
                  <!-- end card body -->
                </div>
                <!-- end card -->
              </div>
              
              <!-- end col -->
              <div class="col-xl-4 col-md-6">
                <div class="dashboardminicard card">
                  <?php if(is_admin()) : ?>
                 <a href="<?=base_url('admin/payments/index')?>"> 
                  <?php endif; ?>
                 <div class="card-body">
                    <div class="d-flex align-items-center">
                      <div class="avatar-sm flex-shrink-0">
                        <span
                          class="avatar-title bg-light text-info rounded-circle fs-3"
                        >
                          <i class="ri-book-open-line text-info"></i>
                        </span>
                      </div>
                      <div
                        class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center"
                      >
                        <h4 class="mb-0 fs-5">Payments</h4>
                        <span class="badge text-info fs-4"><?=$number_of_payments?></span>
                      </div>
                    </div>
                  </div></a>
                  <!-- end card body -->
                </div>
                <!-- end card -->
              </div>
              <!-- end col -->
              <div class="col-xl-3 col-md-6 d-none">
                <div class="dashboardminicard card">
                 <a href="<?=base_url('admin/question_bank/index')?>"> <div class="card-body">
                    <div class="d-flex align-items-center">
                      <div class="avatar-sm flex-shrink-0">
                        <span
                          class="avatar-title bg-light text-info rounded-circle fs-3"
                        >
                          <i class="ri-question-line text-info"></i>
                        </span>
                      </div>
                      <div
                        class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center"
                      >
                        <h4 class="mb-0 fs-5">Questions</h4>
                        <span class="badge text-info fs-4"><?=$number_of_questions?></span>
                      </div>
                    </div>
                  </div></a>
                  <!-- end card body -->
                </div>
                <!-- end card -->
              </div>
              <!-- end col -->
            </div>       
            <?php endif; ?>                       
    </div>


     <div class="row h-100">
              <?php if(is_instructor()) : ?>
              <div class="col-xl-4 col-md-6">
                <div class="dashboardminicard card">
                 <a href="<?=base_url('admin/cohorts/index')?>"> <div class="card-body">
                    <div class="d-flex align-items-center">
                      <div class="avatar-sm flex-shrink-0">
                        <span
                          class="avatar-title bg-light text-success rounded-circle fs-3"
                        >
                          <i class="ri-booklet-line text-success"></i>
                        </span>
                      </div>
                      <div
                        class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center"
                      >
                        <h4 class="mb-0 fs-5">Cohorts</h4>
                        <span class="badge text-success fs-4"><?=$number_of_cohorts?></span>
                      </div>
                    </div>
                  </div></a>
                  <!-- end card body -->
                </div>
                <!-- end card -->
              </div>
              <!-- end col -->
              <?php endif; ?>
      </div>
    <div class="row d-none">
                    <div class="col-xxl-4 col-lg-6">
                        <div class="card card-height-100">
                          <div class="card-header align-items-center d-flex">
                            <h4 class="card-title mb-0 flex-grow-1">
                              Premium Students
                            </h4>
                          </div>
                          <!-- end card header -->
        
                          <div class="card-body">
                            <div id="prjects-status-new"></div>
                            <!-- <div id="prjects-status" data-colors='["--vz-success", "--vz-danger"]' class="apex-charts" dir="ltr"></div> -->
                            <div class="mt-3">
                              <!-- <div class="d-flex justify-content-center align-items-center mb-4">
                                                    <h2 class="me-3 ff-secondary mb-0">258</h2>
                                                    <div>
                                                        <p class="text-muted mb-0">Total Projects</p>
                                                        <p class="text-success fw-medium mb-0">
                                                            <span class="badge bg-success-subtle text-success p-1 rounded-circle"><i class="ri-arrow-right-up-line"></i></span> +3 New
                                                        </p>
                                                    </div>
                                                </div> -->
        
                              <div
                                class="d-flex justify-content-between border-bottom border-bottom-dashed py-2"
                              >
                                <p class="fw-medium mb-0">
                                  <i
                                    class="ri-checkbox-blank-circle-fill text-success align-middle me-2"
                                  ></i>
                                  Full Amount Paid
                                </p>
                                <div>
                                  <span class="text-muted pe-5">120</span>
                                </div>
                              </div>
                              <!-- end -->
        
                              <div class="d-flex justify-content-between py-2">
                                <p class="fw-medium mb-0">
                                  <i
                                    class="ri-checkbox-blank-circle-fill text-danger align-middle me-2"
                                  ></i>
                                  Not Paid
                                </p>
                                <div>
                                  <span class="text-muted pe-5">89</span>
                                </div>
                              </div>
                              <!-- end -->
                            </div>
                          </div>
                          <!-- end cardbody -->
                        </div>
                        <!-- end card -->
                      </div>
                      <!-- end col -->
                  <div class="col-xxl-4">
                    <div class="card card-height-100">
                      <div class="card-header align-items-center d-flex">
                        <h4 class="card-title mb-0 flex-grow-1">
                          Recently Joined Students
                        </h4>
                      </div>
                      <!-- end card header -->

                      <div class="card-body">
                        <div class="table-responsive table-card">
                          <table
                            class="table table-borderless table-hover table-nowrap align-middle mb-0"
                          >
                            <thead class="table-light text-muted">
                              <tr>
                                <th scope="col">Name</th>
                                <th scope="col">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td class="d-flex">
                                  <img
                                    src="assets/images/users/avatar-1.jpg"
                                    alt=""
                                    class="avatar-xs rounded-3 me-2"
                                  />
                                  <div>
                                    <h5 class="fs-13 mb-0">Donald Risher</h5>
                                    <p class="fs-12 mb-0 text-muted">
                                      897654321
                                    </p>
                                  </div>
                                </td>
                                <td>
                                  <h6 class="mb-0">
                                    11/06/24 
                                  </h6>
                                </td>
                              </tr>
                              <!-- end tr -->
                              <tr>
                                <td class="d-flex">
                                  <img
                                    src="assets/images/users/avatar-2.jpg"
                                    alt=""
                                    class="avatar-xs rounded-3 me-2"
                                  />
                                  <div>
                                    <h5 class="fs-13 mb-0">Jansh Brown</h5>
                                    <p class="fs-12 mb-0 text-muted">
                                      8912345678
                                    </p>
                                  </div>
                                </td>
                                <td>
                                  <h6 class="mb-0">
                                    09/06/24 
                                  </h6>
                                </td>
                              </tr>
                              <!-- end tr -->
                              <tr>
                                <td class="d-flex">
                                  <img
                                    src="assets/images/users/avatar-7.jpg"
                                    alt=""
                                    class="avatar-xs rounded-3 me-2"
                                  />
                                  <div>
                                    <h5 class="fs-13 mb-0">Carroll Adams</h5>
                                    <p class="fs-12 mb-0 text-muted">
                                        8912345678
                                    </p>
                                  </div>
                                </td>
                                <td>
                                  <h6 class="mb-0">
                                    02/06/24
                                  </h6>
                                </td>
                              </tr>
                              <!-- end tr -->
                              <tr>
                                <td class="d-flex">
                                  <img
                                    src="assets/images/users/avatar-4.jpg"
                                    alt=""
                                    class="avatar-xs rounded-3 me-2"
                                  />
                                  <div>
                                    <h5 class="fs-13 mb-0">William Pinto</h5>
                                    <p class="fs-12 mb-0 text-muted">
                                        8912345678
                                    </p>
                                  </div>
                                </td>
                                <td>
                                  <h6 class="mb-0">
                                    01/06/24
                                  </h6>
                                </td>
                              </tr>
                              <!-- end tr -->
                              <tr>
                                <td class="d-flex">
                                  <img
                                    src="assets/images/users/avatar-6.jpg"
                                    alt=""
                                    class="avatar-xs rounded-3 me-2"
                                  />
                                  <div>
                                    <h5 class="fs-13 mb-0">Garry Fournier</h5>
                                    <p class="fs-12 mb-0 text-muted">
                                        8912345678
                                    </p>
                                  </div>
                                </td>
                                <td>
                                  <h6 class="mb-0">
                                    01/06/24
                                  </h6>
                                </td>
                              </tr>
                              <!-- end tr -->
                              <tr>
                                <td class="d-flex">
                                  <img
                                    src="assets/images/users/avatar-5.jpg"
                                    alt=""
                                    class="avatar-xs rounded-3 me-2"
                                  />
                                  <div>
                                    <h5 class="fs-13 mb-0">Susan Denton</h5>
                                    <p class="fs-12 mb-0 text-muted">
                                        8912345678
                                    </p>
                                  </div>
                                </td>

                                <td>
                                  <h6 class="mb-0">
                                    01/06/24
                                  </h6>
                                </td>
                              </tr>
                              <!-- end tr -->
                              <tr>
                                <td class="d-flex">
                                  <img
                                    src="assets/images/users/avatar-3.jpg"
                                    alt=""
                                    class="avatar-xs rounded-3 me-2"
                                  />
                                  <div>
                                    <h5 class="fs-13 mb-0">Joseph Jackson</h5>
                                    <p class="fs-12 mb-0 text-muted">
                                        8912345678
                                    </p>
                                  </div>
                                </td>
                                <td>
                                  <h6 class="mb-0">
                                    01/06/24
                                </h6>
                                </td>
                              </tr>
                              <!-- end tr -->
                            </tbody>
                            <!-- end tbody -->
                          </table>
                          <!-- end table -->
                        </div>
                      </div>
                      <!-- end cardbody -->
                    </div>
                    <!-- end card -->
                  </div>
                  <!-- end col -->
                  <div class="col-xxl-4">
                    <div class="card card-height-100">
                        <div class="card-header align-items-center d-flex">
                            <h4 class="card-title mb-0 flex-grow-1">Upcoming Activities</h4>
                        </div><!-- end card header -->
                        <div class="card-body pt-0">
                            <ul class="list-group list-group-flush border-dashed">
                                <li class="list-group-item ps-0">
                                    <div class="row align-items-center g-3">
                                        <div class="col-auto">
                                            <div class="avatar-sm p-1 py-2 h-auto bg-light rounded-3">
                                                <div class="text-center">
                                                    <h5 class="mb-0">28</h5>
                                                    <div class="text-muted">Fri</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h5 class="text-muted mt-0 mb-1 fs-13">09:00am - 10:30am</h5>
                                            <a href="#" class="text-reset fs-14 mb-0">Upcoming Exam - Math (Chapter 3-4)</a>
                                        </div>
                                        <div class="col-sm-auto">
                                            <span class="badge bg-info fs-14">Exam</span>
                                        </div>
                                    </div><!-- end row -->
                                </li><!-- end -->
                                <li class="list-group-item ps-0">
                                    <div class="row align-items-center g-3">
                                        <div class="col-auto">
                                            <div class="avatar-sm p-1 py-2 h-auto bg-light rounded-3">
                                                <div class="text-center">
                                                    <h5 class="mb-0">30</h5>
                                                    <div class="text-muted">Sat</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h5 class="text-muted mt-0 mb-1 fs-13">01:00pm - 02:30pm</h5>
                                            <a href="#" class="text-reset fs-14 mb-0">New Course to be Published - Web Development Fundamentals</a>
                                        </div>
                                        <div class="col-sm-auto">
                                            <span class="badge bg-success fs-14">Course</span>
                                        </div>
                                    </div><!-- end row -->
                                </li><!-- end -->
                            </ul><!-- end -->
                        </div><!-- end card body -->
                    </div><!-- end card -->
                </div> <!-- end col-->
                
                </div>
        

        <div class="row d-none" >
            <div class="col-xxl-6">
                <div class="card card-height-100">
                    <div class="card-header align-items-center d-flex">
                        <h4 class="card-title mb-0 flex-grow-1">Balance Overview</h4>
                        <div class="flex-shrink-0">
                            <div class="dropdown card-header-dropdown">
                                <a class="text-reset dropdown-btn" href="#" data-bs-toggle="dropdown" aria-haspopup="true"
                                    aria-expanded="false">
                                    <span class="fw-semibold text-uppercase fs-12">Sort by: </span><span
                                        class="text-muted">Current Year<i class="mdi mdi-chevron-down ms-1"></i></span>
                                </a>
                                <div class="dropdown-menu dropdown-menu-end">
                                    <a class="dropdown-item" href="#">Today</a>
                                    <a class="dropdown-item" href="#">Last Week</a>
                                    <a class="dropdown-item" href="#">Last Month</a>
                                    <a class="dropdown-item" href="#">Current Year</a>
                                </div>
                            </div>
                        </div>
                    </div><!-- end card header -->
                    <div class="card-body px-0">
                        <ul class="list-inline main-chart text-center mb-0">
                            <li class="list-inline-item chart-border-left me-0 border-0">
                                <h4 class="text-primary">$584k <span
                                        class="text-muted d-inline-block fs-13 align-middle ms-2">Revenue</span></h4>
                            </li>
                            <li class="list-inline-item chart-border-left me-0">
                                <h4>$497k<span class="text-muted d-inline-block fs-13 align-middle ms-2">Expenses</span>
                                </h4>
                            </li>
                            <li class="list-inline-item chart-border-left me-0">
                                <h4><span data-plugin="counterup">3.6</span>%<span
                                        class="text-muted d-inline-block fs-13 align-middle ms-2">Profit Ratio</span></h4>
                            </li>
                        </ul>

                        <div id="revenue-expenses-charts" data-colors="[&quot;--vz-success&quot;, &quot;--vz-danger&quot;]"
                            class="apex-charts" dir="ltr" style="min-height: 305px;">
                            <div id="apexcharts1c5zi2vz" class="apexcharts-canvas apexcharts1c5zi2vz apexcharts-theme-light"
                                style="width: 671px; height: 290px;"><svg id="SvgjsSvg1585" width="671" height="290"
                                    xmlns="http://www.w3.org/2000/svg" version="1.1"
                                    xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.dev"
                                    class="apexcharts-svg apexcharts-zoomable" xmlns:data="ApexChartsNS"
                                    transform="translate(0, 0)" style="background: transparent;">
                                    <foreignObject x="0" y="0" width="671" height="290">
                                        <div class="apexcharts-legend apexcharts-align-center apx-legend-position-bottom"
                                            xmlns="http://www.w3.org/1999/xhtml"
                                            style="inset: auto 0px 1px; position: absolute; max-height: 145px;">
                                            <div class="apexcharts-legend-series" rel="1" seriesname="Revenue"
                                                data:collapsed="false" style="margin: 2px 5px;"><span
                                                    class="apexcharts-legend-marker" rel="1" data:collapsed="false"
                                                    style="background: rgb(10, 179, 156) !important; color: rgb(10, 179, 156); height: 12px; width: 12px; left: 0px; top: 0px; border-width: 0px; border-color: rgb(255, 255, 255); border-radius: 12px;"></span><span
                                                    class="apexcharts-legend-text" rel="1" i="0" data:default-text="Revenue"
                                                    data:collapsed="false"
                                                    style="color: rgb(55, 61, 63); font-size: 12px; font-weight: 400; font-family: Helvetica, Arial, sans-serif;">Revenue</span>
                                            </div>
                                            <div class="apexcharts-legend-series" rel="2" seriesname="Expenses"
                                                data:collapsed="false" style="margin: 2px 5px;"><span
                                                    class="apexcharts-legend-marker" rel="2" data:collapsed="false"
                                                    style="background: rgb(240, 101, 72) !important; color: rgb(240, 101, 72); height: 12px; width: 12px; left: 0px; top: 0px; border-width: 0px; border-color: rgb(255, 255, 255); border-radius: 12px;"></span><span
                                                    class="apexcharts-legend-text" rel="2" i="1"
                                                    data:default-text="Expenses" data:collapsed="false"
                                                    style="color: rgb(55, 61, 63); font-size: 12px; font-weight: 400; font-family: Helvetica, Arial, sans-serif;">Expenses</span>
                                            </div>
                                        </div>
                                        <style type="text/css">
                                            .apexcharts-legend {
                                                display: flex;
                                                overflow: auto;
                                                padding: 0 10px;
                                            }

                                            .apexcharts-legend.apx-legend-position-bottom,
                                            .apexcharts-legend.apx-legend-position-top {
                                                flex-wrap: wrap
                                            }

                                            .apexcharts-legend.apx-legend-position-right,
                                            .apexcharts-legend.apx-legend-position-left {
                                                flex-direction: column;
                                                bottom: 0;
                                            }

                                            .apexcharts-legend.apx-legend-position-bottom.apexcharts-align-left,
                                            .apexcharts-legend.apx-legend-position-top.apexcharts-align-left,
                                            .apexcharts-legend.apx-legend-position-right,
                                            .apexcharts-legend.apx-legend-position-left {
                                                justify-content: flex-start;
                                            }

                                            .apexcharts-legend.apx-legend-position-bottom.apexcharts-align-center,
                                            .apexcharts-legend.apx-legend-position-top.apexcharts-align-center {
                                                justify-content: center;
                                            }

                                            .apexcharts-legend.apx-legend-position-bottom.apexcharts-align-right,
                                            .apexcharts-legend.apx-legend-position-top.apexcharts-align-right {
                                                justify-content: flex-end;
                                            }

                                            .apexcharts-legend-series {
                                                cursor: pointer;
                                                line-height: normal;
                                            }

                                            .apexcharts-legend.apx-legend-position-bottom .apexcharts-legend-series,
                                            .apexcharts-legend.apx-legend-position-top .apexcharts-legend-series {
                                                display: flex;
                                                align-items: center;
                                            }

                                            .apexcharts-legend-text {
                                                position: relative;
                                                font-size: 14px;
                                            }

                                            .apexcharts-legend-text *,
                                            .apexcharts-legend-marker * {
                                                pointer-events: none;
                                            }

                                            .apexcharts-legend-marker {
                                                position: relative;
                                                display: inline-block;
                                                cursor: pointer;
                                                margin-right: 3px;
                                                border-style: solid;
                                            }

                                            .apexcharts-legend.apexcharts-align-right .apexcharts-legend-series,
                                            .apexcharts-legend.apexcharts-align-left .apexcharts-legend-series {
                                                display: inline-block;
                                            }

                                            .apexcharts-legend-series.apexcharts-no-click {
                                                cursor: auto;
                                            }

                                            .apexcharts-legend .apexcharts-hidden-zero-series,
                                            .apexcharts-legend .apexcharts-hidden-null-series {
                                                display: none !important;
                                            }

                                            .apexcharts-inactive-legend {
                                                opacity: 0.45;
                                            }
                                        </style>
                                    </foreignObject>
                                    <rect id="SvgjsRect1590" width="0" height="0" x="0" y="0" rx="0" ry="0" opacity="1"
                                        stroke-width="0" stroke="none" stroke-dasharray="0" fill="#fefefe"></rect>
                                    <g id="SvgjsG1670" class="apexcharts-yaxis" rel="0"
                                        transform="translate(30.0599365234375, 0)">
                                        <g id="SvgjsG1671" class="apexcharts-yaxis-texts-g"><text id="SvgjsText1673"
                                                font-family="Helvetica, Arial, sans-serif" x="20" y="31.5" text-anchor="end"
                                                dominant-baseline="auto" font-size="11px" font-weight="400" fill="#373d3f"
                                                class="apexcharts-text apexcharts-yaxis-label "
                                                style="font-family: Helvetica, Arial, sans-serif;">
                                                <tspan id="SvgjsTspan1674">$260k</tspan>
                                                <title>$260k</title>
                                            </text><text id="SvgjsText1676" font-family="Helvetica, Arial, sans-serif"
                                                x="20" y="70.1988" text-anchor="end" dominant-baseline="auto"
                                                font-size="11px" font-weight="400" fill="#373d3f"
                                                class="apexcharts-text apexcharts-yaxis-label "
                                                style="font-family: Helvetica, Arial, sans-serif;">
                                                <tspan id="SvgjsTspan1677">$208k</tspan>
                                                <title>$208k</title>
                                            </text><text id="SvgjsText1679" font-family="Helvetica, Arial, sans-serif"
                                                x="20" y="108.89760000000001" text-anchor="end" dominant-baseline="auto"
                                                font-size="11px" font-weight="400" fill="#373d3f"
                                                class="apexcharts-text apexcharts-yaxis-label "
                                                style="font-family: Helvetica, Arial, sans-serif;">
                                                <tspan id="SvgjsTspan1680">$156k</tspan>
                                                <title>$156k</title>
                                            </text><text id="SvgjsText1682" font-family="Helvetica, Arial, sans-serif"
                                                x="20" y="147.59640000000002" text-anchor="end" dominant-baseline="auto"
                                                font-size="11px" font-weight="400" fill="#373d3f"
                                                class="apexcharts-text apexcharts-yaxis-label "
                                                style="font-family: Helvetica, Arial, sans-serif;">
                                                <tspan id="SvgjsTspan1683">$104k</tspan>
                                                <title>$104k</title>
                                            </text><text id="SvgjsText1685" font-family="Helvetica, Arial, sans-serif"
                                                x="20" y="186.29520000000002" text-anchor="end" dominant-baseline="auto"
                                                font-size="11px" font-weight="400" fill="#373d3f"
                                                class="apexcharts-text apexcharts-yaxis-label "
                                                style="font-family: Helvetica, Arial, sans-serif;">
                                                <tspan id="SvgjsTspan1686">$52k</tspan>
                                                <title>$52k</title>
                                            </text><text id="SvgjsText1688" font-family="Helvetica, Arial, sans-serif"
                                                x="20" y="224.99400000000003" text-anchor="end" dominant-baseline="auto"
                                                font-size="11px" font-weight="400" fill="#373d3f"
                                                class="apexcharts-text apexcharts-yaxis-label "
                                                style="font-family: Helvetica, Arial, sans-serif;">
                                                <tspan id="SvgjsTspan1689">$0k</tspan>
                                                <title>$0k</title>
                                            </text></g>
                                    </g>
                                    <g id="SvgjsG1587" class="apexcharts-inner apexcharts-graphical"
                                        transform="translate(60.0599365234375, 30)">
                                        <defs id="SvgjsDefs1586">
                                            <clipPath id="gridRectMask1c5zi2vz">
                                                <rect id="SvgjsRect1592" width="593.9780731201172" height="195.494" x="-3"
                                                    y="-1" rx="0" ry="0" opacity="1" stroke-width="0" stroke="none"
                                                    stroke-dasharray="0" fill="#fff"></rect>
                                            </clipPath>
                                            <clipPath id="forecastMask1c5zi2vz"></clipPath>
                                            <clipPath id="nonForecastMask1c5zi2vz"></clipPath>
                                            <clipPath id="gridRectMarkerMask1c5zi2vz">
                                                <rect id="SvgjsRect1593" width="591.9780731201172" height="197.494" x="-2"
                                                    y="-2" rx="0" ry="0" opacity="1" stroke-width="0" stroke="none"
                                                    stroke-dasharray="0" fill="#fff"></rect>
                                            </clipPath>
                                        </defs>
                                        <line id="SvgjsLine1591" x1="106.40510420365767" y1="0" x2="106.40510420365767"
                                            y2="193.494" stroke="#b6b6b6" stroke-dasharray="3" stroke-linecap="butt"
                                            class="apexcharts-xcrosshairs" x="106.40510420365767" y="0" width="1"
                                            height="193.494" fill="#b1b9c4" filter="none" fill-opacity="0.9"
                                            stroke-width="1"></line>
                                        <line id="SvgjsLine1609" x1="0" y1="194.494" x2="0" y2="200.494" stroke="#e0e0e0"
                                            stroke-dasharray="0" stroke-linecap="butt" class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1610" x1="53.452552101828836" y1="194.494"
                                            x2="53.452552101828836" y2="200.494" stroke="#e0e0e0" stroke-dasharray="0"
                                            stroke-linecap="butt" class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1611" x1="106.90510420365767" y1="194.494"
                                            x2="106.90510420365767" y2="200.494" stroke="#e0e0e0" stroke-dasharray="0"
                                            stroke-linecap="butt" class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1612" x1="160.3576563054865" y1="194.494" x2="160.3576563054865"
                                            y2="200.494" stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                            class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1613" x1="213.81020840731534" y1="194.494"
                                            x2="213.81020840731534" y2="200.494" stroke="#e0e0e0" stroke-dasharray="0"
                                            stroke-linecap="butt" class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1614" x1="267.2627605091442" y1="194.494" x2="267.2627605091442"
                                            y2="200.494" stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                            class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1615" x1="320.715312610973" y1="194.494" x2="320.715312610973"
                                            y2="200.494" stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                            class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1616" x1="374.1678647128018" y1="194.494" x2="374.1678647128018"
                                            y2="200.494" stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                            class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1617" x1="427.62041681463063" y1="194.494"
                                            x2="427.62041681463063" y2="200.494" stroke="#e0e0e0" stroke-dasharray="0"
                                            stroke-linecap="butt" class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1618" x1="481.07296891645944" y1="194.494"
                                            x2="481.07296891645944" y2="200.494" stroke="#e0e0e0" stroke-dasharray="0"
                                            stroke-linecap="butt" class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1619" x1="534.5255210182883" y1="194.494" x2="534.5255210182883"
                                            y2="200.494" stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                            class="apexcharts-xaxis-tick"></line>
                                        <line id="SvgjsLine1620" x1="587.9780731201171" y1="194.494" x2="587.9780731201171"
                                            y2="200.494" stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                            class="apexcharts-xaxis-tick"></line>
                                        <g id="SvgjsG1605" class="apexcharts-grid">
                                            <g id="SvgjsG1606" class="apexcharts-gridlines-horizontal">
                                                <line id="SvgjsLine1622" x1="0" y1="38.6988" x2="587.9780731201172"
                                                    y2="38.6988" stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                                    class="apexcharts-gridline"></line>
                                                <line id="SvgjsLine1623" x1="0" y1="77.3976" x2="587.9780731201172"
                                                    y2="77.3976" stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                                    class="apexcharts-gridline"></line>
                                                <line id="SvgjsLine1624" x1="0" y1="116.09639999999999"
                                                    x2="587.9780731201172" y2="116.09639999999999" stroke="#e0e0e0"
                                                    stroke-dasharray="0" stroke-linecap="butt" class="apexcharts-gridline">
                                                </line>
                                                <line id="SvgjsLine1625" x1="0" y1="154.7952" x2="587.9780731201172"
                                                    y2="154.7952" stroke="#e0e0e0" stroke-dasharray="0"
                                                    stroke-linecap="butt" class="apexcharts-gridline"></line>
                                            </g>
                                            <g id="SvgjsG1607" class="apexcharts-gridlines-vertical"></g>
                                            <line id="SvgjsLine1628" x1="0" y1="193.494" x2="587.9780731201172" y2="193.494"
                                                stroke="transparent" stroke-dasharray="0" stroke-linecap="butt"></line>
                                            <line id="SvgjsLine1627" x1="0" y1="1" x2="0" y2="193.494" stroke="transparent"
                                                stroke-dasharray="0" stroke-linecap="butt"></line>
                                        </g>
                                        <g id="SvgjsG1594" class="apexcharts-area-series apexcharts-plot-series">
                                            <g id="SvgjsG1595" class="apexcharts-series" seriesName="Revenue"
                                                data:longestSeries="true" rel="1" data:realIndex="0">
                                                <path id="SvgjsPath1598"
                                                    d="M 0 193.494 L 0 178.60984615384615C 18.70839323564009 178.60984615384615 34.74415886618874 174.8888076923077 53.452552101828836 174.8888076923077C 72.16094533746893 174.8888076923077 88.19671096801758 171.16776923076924 106.90510420365767 171.16776923076924C 125.61349743929776 171.16776923076924 141.64926306984643 167.44673076923078 160.3576563054865 167.44673076923078C 179.0660495411266 167.44673076923078 195.10181517167524 163.7256923076923 213.81020840731534 163.7256923076923C 232.51860164295545 163.7256923076923 248.55436727350408 152.56257692307693 267.2627605091442 152.56257692307693C 285.97115374478426 152.56257692307693 302.0069193753329 141.39946153846154 320.715312610973 141.39946153846154C 339.4237058466131 141.39946153846154 355.45947147716174 111.63115384615385 374.1678647128019 111.63115384615385C 392.87625794844195 111.63115384615385 408.9120235789906 81.86284615384615 427.6204168146307 81.86284615384615C 446.32881005027076 81.86284615384615 462.3645756808194 59.536615384615374 481.0729689164595 59.536615384615374C 499.78136215209963 59.536615384615374 515.8171277826483 37.21038461538461 534.5255210182884 37.21038461538461C 553.2339142539284 37.21038461538461 569.2696798844771 7.442076923076911 587.9780731201172 7.442076923076911C 587.9780731201172 7.442076923076911 587.9780731201172 7.442076923076911 587.9780731201172 193.494M 587.9780731201172 7.442076923076911z"
                                                    fill="rgba(10,179,156,0.06)" fill-opacity="1" stroke-opacity="1"
                                                    stroke-linecap="butt" stroke-width="0" stroke-dasharray="0"
                                                    class="apexcharts-area" index="0" clip-path="url(#gridRectMask1c5zi2vz)"
                                                    pathTo="M 0 193.494 L 0 178.60984615384615C 18.70839323564009 178.60984615384615 34.74415886618874 174.8888076923077 53.452552101828836 174.8888076923077C 72.16094533746893 174.8888076923077 88.19671096801758 171.16776923076924 106.90510420365767 171.16776923076924C 125.61349743929776 171.16776923076924 141.64926306984643 167.44673076923078 160.3576563054865 167.44673076923078C 179.0660495411266 167.44673076923078 195.10181517167524 163.7256923076923 213.81020840731534 163.7256923076923C 232.51860164295545 163.7256923076923 248.55436727350408 152.56257692307693 267.2627605091442 152.56257692307693C 285.97115374478426 152.56257692307693 302.0069193753329 141.39946153846154 320.715312610973 141.39946153846154C 339.4237058466131 141.39946153846154 355.45947147716174 111.63115384615385 374.1678647128019 111.63115384615385C 392.87625794844195 111.63115384615385 408.9120235789906 81.86284615384615 427.6204168146307 81.86284615384615C 446.32881005027076 81.86284615384615 462.3645756808194 59.536615384615374 481.0729689164595 59.536615384615374C 499.78136215209963 59.536615384615374 515.8171277826483 37.21038461538461 534.5255210182884 37.21038461538461C 553.2339142539284 37.21038461538461 569.2696798844771 7.442076923076911 587.9780731201172 7.442076923076911C 587.9780731201172 7.442076923076911 587.9780731201172 7.442076923076911 587.9780731201172 193.494M 587.9780731201172 7.442076923076911z"
                                                    pathFrom="M -1 193.494 L -1 193.494 L 53.452552101828836 193.494 L 106.90510420365767 193.494 L 160.3576563054865 193.494 L 213.81020840731534 193.494 L 267.2627605091442 193.494 L 320.715312610973 193.494 L 374.1678647128019 193.494 L 427.6204168146307 193.494 L 481.0729689164595 193.494 L 534.5255210182884 193.494 L 587.9780731201172 193.494">
                                                </path>
                                                <path id="SvgjsPath1599"
                                                    d="M 0 178.60984615384615C 18.70839323564009 178.60984615384615 34.74415886618874 174.8888076923077 53.452552101828836 174.8888076923077C 72.16094533746893 174.8888076923077 88.19671096801758 171.16776923076924 106.90510420365767 171.16776923076924C 125.61349743929776 171.16776923076924 141.64926306984643 167.44673076923078 160.3576563054865 167.44673076923078C 179.0660495411266 167.44673076923078 195.10181517167524 163.7256923076923 213.81020840731534 163.7256923076923C 232.51860164295545 163.7256923076923 248.55436727350408 152.56257692307693 267.2627605091442 152.56257692307693C 285.97115374478426 152.56257692307693 302.0069193753329 141.39946153846154 320.715312610973 141.39946153846154C 339.4237058466131 141.39946153846154 355.45947147716174 111.63115384615385 374.1678647128019 111.63115384615385C 392.87625794844195 111.63115384615385 408.9120235789906 81.86284615384615 427.6204168146307 81.86284615384615C 446.32881005027076 81.86284615384615 462.3645756808194 59.536615384615374 481.0729689164595 59.536615384615374C 499.78136215209963 59.536615384615374 515.8171277826483 37.21038461538461 534.5255210182884 37.21038461538461C 553.2339142539284 37.21038461538461 569.2696798844771 7.442076923076911 587.9780731201172 7.442076923076911"
                                                    fill="none" fill-opacity="1" stroke="#0ab39c" stroke-opacity="1"
                                                    stroke-linecap="butt" stroke-width="2" stroke-dasharray="0"
                                                    class="apexcharts-area" index="0" clip-path="url(#gridRectMask1c5zi2vz)"
                                                    pathTo="M 0 178.60984615384615C 18.70839323564009 178.60984615384615 34.74415886618874 174.8888076923077 53.452552101828836 174.8888076923077C 72.16094533746893 174.8888076923077 88.19671096801758 171.16776923076924 106.90510420365767 171.16776923076924C 125.61349743929776 171.16776923076924 141.64926306984643 167.44673076923078 160.3576563054865 167.44673076923078C 179.0660495411266 167.44673076923078 195.10181517167524 163.7256923076923 213.81020840731534 163.7256923076923C 232.51860164295545 163.7256923076923 248.55436727350408 152.56257692307693 267.2627605091442 152.56257692307693C 285.97115374478426 152.56257692307693 302.0069193753329 141.39946153846154 320.715312610973 141.39946153846154C 339.4237058466131 141.39946153846154 355.45947147716174 111.63115384615385 374.1678647128019 111.63115384615385C 392.87625794844195 111.63115384615385 408.9120235789906 81.86284615384615 427.6204168146307 81.86284615384615C 446.32881005027076 81.86284615384615 462.3645756808194 59.536615384615374 481.0729689164595 59.536615384615374C 499.78136215209963 59.536615384615374 515.8171277826483 37.21038461538461 534.5255210182884 37.21038461538461C 553.2339142539284 37.21038461538461 569.2696798844771 7.442076923076911 587.9780731201172 7.442076923076911"
                                                    pathFrom="M -1 193.494 L -1 193.494 L 53.452552101828836 193.494 L 106.90510420365767 193.494 L 160.3576563054865 193.494 L 213.81020840731534 193.494 L 267.2627605091442 193.494 L 320.715312610973 193.494 L 374.1678647128019 193.494 L 427.6204168146307 193.494 L 481.0729689164595 193.494 L 534.5255210182884 193.494 L 587.9780731201172 193.494"
                                                    fill-rule="evenodd"></path>
                                                <g id="SvgjsG1596"
                                                    class="apexcharts-series-markers-wrap apexcharts-hidden-element-shown"
                                                    data:realIndex="0">
                                                    <g class="apexcharts-series-markers">
                                                        <circle id="SvgjsCircle1693" r="0" cx="106.90510420365767"
                                                            cy="171.16776923076924"
                                                            class="apexcharts-marker wklmzubx no-pointer-events"
                                                            stroke="#ffffff" fill="#0ab39c" fill-opacity="1"
                                                            stroke-width="2" stroke-opacity="0.9" default-marker-size="0">
                                                        </circle>
                                                    </g>
                                                </g>
                                            </g>
                                            <g id="SvgjsG1600" class="apexcharts-series" seriesName="Expenses"
                                                data:longestSeries="true" rel="2" data:realIndex="1">
                                                <path id="SvgjsPath1603"
                                                    d="M 0 193.494 L 0 184.5635076923077C 18.70839323564009 184.5635076923077 34.74415886618874 180.84246923076924 53.452552101828836 180.84246923076924C 72.16094533746893 180.84246923076924 88.19671096801758 160.00465384615384 106.90510420365767 160.00465384615384C 125.61349743929776 160.00465384615384 141.64926306984643 162.23727692307693 160.3576563054865 162.23727692307693C 179.0660495411266 162.23727692307693 195.10181517167524 175.6330153846154 213.81020840731534 175.6330153846154C 232.51860164295545 175.6330153846154 248.55436727350408 167.44673076923078 267.2627605091442 167.44673076923078C 285.97115374478426 167.44673076923078 302.0069193753329 162.23727692307693 320.715312610973 162.23727692307693C 339.4237058466131 162.23727692307693 355.45947147716174 137.67842307692308 374.1678647128019 137.67842307692308C 392.87625794844195 137.67842307692308 408.9120235789906 117.58481538461538 427.6204168146307 117.58481538461538C 446.32881005027076 117.58481538461538 462.3645756808194 113.11956923076923 481.0729689164595 113.11956923076923C 499.78136215209963 113.11956923076923 515.8171277826483 77.3976 534.5255210182884 77.3976C 553.2339142539284 77.3976 569.2696798844771 45.39666923076922 587.9780731201172 45.39666923076922C 587.9780731201172 45.39666923076922 587.9780731201172 45.39666923076922 587.9780731201172 193.494M 587.9780731201172 45.39666923076922z"
                                                    fill="rgba(240,101,72,0.06)" fill-opacity="1" stroke-opacity="1"
                                                    stroke-linecap="butt" stroke-width="0" stroke-dasharray="0"
                                                    class="apexcharts-area" index="1" clip-path="url(#gridRectMask1c5zi2vz)"
                                                    pathTo="M 0 193.494 L 0 184.5635076923077C 18.70839323564009 184.5635076923077 34.74415886618874 180.84246923076924 53.452552101828836 180.84246923076924C 72.16094533746893 180.84246923076924 88.19671096801758 160.00465384615384 106.90510420365767 160.00465384615384C 125.61349743929776 160.00465384615384 141.64926306984643 162.23727692307693 160.3576563054865 162.23727692307693C 179.0660495411266 162.23727692307693 195.10181517167524 175.6330153846154 213.81020840731534 175.6330153846154C 232.51860164295545 175.6330153846154 248.55436727350408 167.44673076923078 267.2627605091442 167.44673076923078C 285.97115374478426 167.44673076923078 302.0069193753329 162.23727692307693 320.715312610973 162.23727692307693C 339.4237058466131 162.23727692307693 355.45947147716174 137.67842307692308 374.1678647128019 137.67842307692308C 392.87625794844195 137.67842307692308 408.9120235789906 117.58481538461538 427.6204168146307 117.58481538461538C 446.32881005027076 117.58481538461538 462.3645756808194 113.11956923076923 481.0729689164595 113.11956923076923C 499.78136215209963 113.11956923076923 515.8171277826483 77.3976 534.5255210182884 77.3976C 553.2339142539284 77.3976 569.2696798844771 45.39666923076922 587.9780731201172 45.39666923076922C 587.9780731201172 45.39666923076922 587.9780731201172 45.39666923076922 587.9780731201172 193.494M 587.9780731201172 45.39666923076922z"
                                                    pathFrom="M -1 193.494 L -1 193.494 L 53.452552101828836 193.494 L 106.90510420365767 193.494 L 160.3576563054865 193.494 L 213.81020840731534 193.494 L 267.2627605091442 193.494 L 320.715312610973 193.494 L 374.1678647128019 193.494 L 427.6204168146307 193.494 L 481.0729689164595 193.494 L 534.5255210182884 193.494 L 587.9780731201172 193.494">
                                                </path>
                                                <path id="SvgjsPath1604"
                                                    d="M 0 184.5635076923077C 18.70839323564009 184.5635076923077 34.74415886618874 180.84246923076924 53.452552101828836 180.84246923076924C 72.16094533746893 180.84246923076924 88.19671096801758 160.00465384615384 106.90510420365767 160.00465384615384C 125.61349743929776 160.00465384615384 141.64926306984643 162.23727692307693 160.3576563054865 162.23727692307693C 179.0660495411266 162.23727692307693 195.10181517167524 175.6330153846154 213.81020840731534 175.6330153846154C 232.51860164295545 175.6330153846154 248.55436727350408 167.44673076923078 267.2627605091442 167.44673076923078C 285.97115374478426 167.44673076923078 302.0069193753329 162.23727692307693 320.715312610973 162.23727692307693C 339.4237058466131 162.23727692307693 355.45947147716174 137.67842307692308 374.1678647128019 137.67842307692308C 392.87625794844195 137.67842307692308 408.9120235789906 117.58481538461538 427.6204168146307 117.58481538461538C 446.32881005027076 117.58481538461538 462.3645756808194 113.11956923076923 481.0729689164595 113.11956923076923C 499.78136215209963 113.11956923076923 515.8171277826483 77.3976 534.5255210182884 77.3976C 553.2339142539284 77.3976 569.2696798844771 45.39666923076922 587.9780731201172 45.39666923076922"
                                                    fill="none" fill-opacity="1" stroke="#f06548" stroke-opacity="1"
                                                    stroke-linecap="butt" stroke-width="2" stroke-dasharray="0"
                                                    class="apexcharts-area" index="1" clip-path="url(#gridRectMask1c5zi2vz)"
                                                    pathTo="M 0 184.5635076923077C 18.70839323564009 184.5635076923077 34.74415886618874 180.84246923076924 53.452552101828836 180.84246923076924C 72.16094533746893 180.84246923076924 88.19671096801758 160.00465384615384 106.90510420365767 160.00465384615384C 125.61349743929776 160.00465384615384 141.64926306984643 162.23727692307693 160.3576563054865 162.23727692307693C 179.0660495411266 162.23727692307693 195.10181517167524 175.6330153846154 213.81020840731534 175.6330153846154C 232.51860164295545 175.6330153846154 248.55436727350408 167.44673076923078 267.2627605091442 167.44673076923078C 285.97115374478426 167.44673076923078 302.0069193753329 162.23727692307693 320.715312610973 162.23727692307693C 339.4237058466131 162.23727692307693 355.45947147716174 137.67842307692308 374.1678647128019 137.67842307692308C 392.87625794844195 137.67842307692308 408.9120235789906 117.58481538461538 427.6204168146307 117.58481538461538C 446.32881005027076 117.58481538461538 462.3645756808194 113.11956923076923 481.0729689164595 113.11956923076923C 499.78136215209963 113.11956923076923 515.8171277826483 77.3976 534.5255210182884 77.3976C 553.2339142539284 77.3976 569.2696798844771 45.39666923076922 587.9780731201172 45.39666923076922"
                                                    pathFrom="M -1 193.494 L -1 193.494 L 53.452552101828836 193.494 L 106.90510420365767 193.494 L 160.3576563054865 193.494 L 213.81020840731534 193.494 L 267.2627605091442 193.494 L 320.715312610973 193.494 L 374.1678647128019 193.494 L 427.6204168146307 193.494 L 481.0729689164595 193.494 L 534.5255210182884 193.494 L 587.9780731201172 193.494"
                                                    fill-rule="evenodd"></path>
                                                <g id="SvgjsG1601"
                                                    class="apexcharts-series-markers-wrap apexcharts-hidden-element-shown"
                                                    data:realIndex="1">
                                                    <g class="apexcharts-series-markers">
                                                        <circle id="SvgjsCircle1694" r="0" cx="106.90510420365767"
                                                            cy="160.00465384615384"
                                                            class="apexcharts-marker w23n3om1m no-pointer-events"
                                                            stroke="#ffffff" fill="#f06548" fill-opacity="1"
                                                            stroke-width="2" stroke-opacity="0.9" default-marker-size="0">
                                                        </circle>
                                                    </g>
                                                </g>
                                            </g>
                                            <g id="SvgjsG1597" class="apexcharts-datalabels" data:realIndex="0"></g>
                                            <g id="SvgjsG1602" class="apexcharts-datalabels" data:realIndex="1"></g>
                                        </g>
                                        <g id="SvgjsG1608" class="apexcharts-grid-borders">
                                            <line id="SvgjsLine1621" x1="0" y1="0" x2="587.9780731201172" y2="0"
                                                stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                                class="apexcharts-gridline"></line>
                                            <line id="SvgjsLine1626" x1="0" y1="193.494" x2="587.9780731201172" y2="193.494"
                                                stroke="#e0e0e0" stroke-dasharray="0" stroke-linecap="butt"
                                                class="apexcharts-gridline"></line>
                                            <line id="SvgjsLine1669" x1="0" y1="194.494" x2="587.9780731201172" y2="194.494"
                                                stroke="#e0e0e0" stroke-dasharray="0" stroke-width="1"
                                                stroke-linecap="butt"></line>
                                        </g>
                                        <line id="SvgjsLine1629" x1="0" y1="0" x2="587.9780731201172" y2="0"
                                            stroke="#b6b6b6" stroke-dasharray="0" stroke-width="1" stroke-linecap="butt"
                                            class="apexcharts-ycrosshairs"></line>
                                        <line id="SvgjsLine1630" x1="0" y1="0" x2="587.9780731201172" y2="0"
                                            stroke-dasharray="0" stroke-width="0" stroke-linecap="butt"
                                            class="apexcharts-ycrosshairs-hidden"></line>
                                        <g id="SvgjsG1631" class="apexcharts-xaxis" transform="translate(0, 0)">
                                            <g id="SvgjsG1632" class="apexcharts-xaxis-texts-g"
                                                transform="translate(0, -4)"><text id="SvgjsText1634"
                                                    font-family="Helvetica, Arial, sans-serif" x="0" y="222.494"
                                                    text-anchor="middle" dominant-baseline="auto" font-size="12px"
                                                    font-weight="400" fill="#373d3f"
                                                    class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1635">Jan</tspan>
                                                    <title>Jan</title>
                                                </text><text id="SvgjsText1637" font-family="Helvetica, Arial, sans-serif"
                                                    x="53.45255210182883" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1638">Feb</tspan>
                                                    <title>Feb</title>
                                                </text><text id="SvgjsText1640" font-family="Helvetica, Arial, sans-serif"
                                                    x="106.90510420365767" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1641">Mar</tspan>
                                                    <title>Mar</title>
                                                </text><text id="SvgjsText1643" font-family="Helvetica, Arial, sans-serif"
                                                    x="160.35765630548653" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1644">Apr</tspan>
                                                    <title>Apr</title>
                                                </text><text id="SvgjsText1646" font-family="Helvetica, Arial, sans-serif"
                                                    x="213.81020840731537" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1647">May</tspan>
                                                    <title>May</title>
                                                </text><text id="SvgjsText1649" font-family="Helvetica, Arial, sans-serif"
                                                    x="267.2627605091442" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1650">Jun</tspan>
                                                    <title>Jun</title>
                                                </text><text id="SvgjsText1652" font-family="Helvetica, Arial, sans-serif"
                                                    x="320.715312610973" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1653">Jul</tspan>
                                                    <title>Jul</title>
                                                </text><text id="SvgjsText1655" font-family="Helvetica, Arial, sans-serif"
                                                    x="374.1678647128018" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1656">Aug</tspan>
                                                    <title>Aug</title>
                                                </text><text id="SvgjsText1658" font-family="Helvetica, Arial, sans-serif"
                                                    x="427.62041681463063" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1659">Sep</tspan>
                                                    <title>Sep</title>
                                                </text><text id="SvgjsText1661" font-family="Helvetica, Arial, sans-serif"
                                                    x="481.07296891645944" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1662">Oct</tspan>
                                                    <title>Oct</title>
                                                </text><text id="SvgjsText1664" font-family="Helvetica, Arial, sans-serif"
                                                    x="534.5255210182883" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1665">Nov</tspan>
                                                    <title>Nov</title>
                                                </text><text id="SvgjsText1667" font-family="Helvetica, Arial, sans-serif"
                                                    x="587.9780731201171" y="222.494" text-anchor="middle"
                                                    dominant-baseline="auto" font-size="12px" font-weight="400"
                                                    fill="#373d3f" class="apexcharts-text apexcharts-xaxis-label "
                                                    style="font-family: Helvetica, Arial, sans-serif;">
                                                    <tspan id="SvgjsTspan1668">Dec</tspan>
                                                    <title>Dec</title>
                                                </text></g>
                                        </g>
                                        <g id="SvgjsG1690" class="apexcharts-yaxis-annotations"></g>
                                        <g id="SvgjsG1691" class="apexcharts-xaxis-annotations"></g>
                                        <g id="SvgjsG1692" class="apexcharts-point-annotations"></g>
                                        <rect id="SvgjsRect1695" width="0" height="0" x="0" y="0" rx="0" ry="0" opacity="1"
                                            stroke-width="0" stroke="none" stroke-dasharray="0" fill="#fefefe"
                                            class="apexcharts-zoom-rect"></rect>
                                        <rect id="SvgjsRect1696" width="0" height="0" x="0" y="0" rx="0" ry="0" opacity="1"
                                            stroke-width="0" stroke="none" stroke-dasharray="0" fill="#fefefe"
                                            class="apexcharts-selection-rect"></rect>
                                    </g>
                                </svg>
                                <div class="apexcharts-tooltip apexcharts-theme-light"
                                    style="left: 177.965px; top: 120.494px;">
                                    <div class="apexcharts-tooltip-title"
                                        style="font-family: Helvetica, Arial, sans-serif; font-size: 12px;">Mar</div>
                                    <div class="apexcharts-tooltip-series-group apexcharts-active"
                                        style="order: 1; display: flex;"><span class="apexcharts-tooltip-marker"
                                            style="background-color: rgb(10, 179, 156);"></span>
                                        <div class="apexcharts-tooltip-text"
                                            style="font-family: Helvetica, Arial, sans-serif; font-size: 12px;">
                                            <div class="apexcharts-tooltip-y-group"><span
                                                    class="apexcharts-tooltip-text-y-label">Revenue: </span><span
                                                    class="apexcharts-tooltip-text-y-value">$30k</span></div>
                                            <div class="apexcharts-tooltip-goals-group"><span
                                                    class="apexcharts-tooltip-text-goals-label"></span><span
                                                    class="apexcharts-tooltip-text-goals-value"></span></div>
                                            <div class="apexcharts-tooltip-z-group"><span
                                                    class="apexcharts-tooltip-text-z-label"></span><span
                                                    class="apexcharts-tooltip-text-z-value"></span></div>
                                        </div>
                                    </div>
                                    <div class="apexcharts-tooltip-series-group apexcharts-active"
                                        style="order: 2; display: flex;"><span class="apexcharts-tooltip-marker"
                                            style="background-color: rgb(240, 101, 72);"></span>
                                        <div class="apexcharts-tooltip-text"
                                            style="font-family: Helvetica, Arial, sans-serif; font-size: 12px;">
                                            <div class="apexcharts-tooltip-y-group"><span
                                                    class="apexcharts-tooltip-text-y-label">Expenses: </span><span
                                                    class="apexcharts-tooltip-text-y-value">$45k</span></div>
                                            <div class="apexcharts-tooltip-goals-group"><span
                                                    class="apexcharts-tooltip-text-goals-label"></span><span
                                                    class="apexcharts-tooltip-text-goals-value"></span></div>
                                            <div class="apexcharts-tooltip-z-group"><span
                                                    class="apexcharts-tooltip-text-z-label"></span><span
                                                    class="apexcharts-tooltip-text-z-value"></span></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="apexcharts-xaxistooltip apexcharts-xaxistooltip-bottom apexcharts-theme-light"
                                    style="left: 145.129px; top: 225.494px;">
                                    <div class="apexcharts-xaxistooltip-text"
                                        style="font-family: Helvetica, Arial, sans-serif; font-size: 12px; min-width: 21.907px;">
                                        Mar</div>
                                </div>
                                <div
                                    class="apexcharts-yaxistooltip apexcharts-yaxistooltip-0 apexcharts-yaxistooltip-left apexcharts-theme-light">
                                    <div class="apexcharts-yaxistooltip-text"></div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div><!-- end card -->
            </div>
        </div><!-- end row -->
    </div>

<style>
      .dashboardminicard.card {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        border-radius: 50px;
      }

      .dashboardminicard.card:hover {
        transform: translateY(-10px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        border-radius: 50px;
      }

      .dashboardminicard.card .card-body {
        transition: background-color 0.3s ease;
        border-radius: 50px;
      }

      .dashboardminicard.card:hover .card-body {
        background-color: #f8f9fa;
        border-radius: 50px;
      }

      .dashboardminicard.card .avatar-title {
        transition: transform 0.3s ease;
      }

      .dashboardminicard.card:hover .avatar-title {
        transform: rotate(360deg);
      }

      @media (min-width: 1200px) {
        .col-lg-2-4 {
          flex: 0 0 auto;
          width: 20%;
        }
      }
        </style>
    <script>
      var options = {
        chart: {
          type: "donut", // Specify the chart type as 'donut'
        },
        series: [20, 80], // Series data should be an array
        labels: ["Fully Paid", "Pending"], // Labels should be an array
        colors: ["#54d661", "#e87472"], // Set specific colors for Fully Paid and Pending using subtle Bootstrap colors
        plotOptions: {
          pie: {
            size: 100,
            offsetX: 0,
            offsetY: 0,
            donut: { size: "70%", labels: { show: !1 } },
          },
        },
        dataLabels: { enabled: !1 },
        legend: { show: !1 },
      };

      var chart = new ApexCharts(
        document.querySelector("#prjects-status-new"),
        options
      );

      chart.render();
    </script>