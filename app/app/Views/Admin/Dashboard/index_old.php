<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<div class="row">
    <div class="col">
        <div class="h-100">
            <div class="row mb-3 pb-1">
                <div class="col-12">
                    <div class="d-flex align-items-lg-center flex-lg-row flex-column">
                        <div class="flex-grow-1">
                            <h4 class="fs-16 mb-1"><?=get_greetings_message().', '. get_user_name().'!'?></h4>
                            <!--<p class="text-muted mb-0">Here's what's happening with your store today.</p>-->
                        </div>
                        <div class="mt-3 mt-lg-0">
                            <!--<form action="javascript:void(0);">-->
                            <!--    <div class="row g-3 mb-0 align-items-center">-->
                            <!--        <div class="col-sm-auto">-->
                            <!--            <div class="input-group">-->
                            <!--                <input type="text" class="form-control border-0 dash-filter-picker shadow" data-provider="flatpickr" data-range-date="true" data-date-format="d M, Y"  value="<?=date('d-M-Y h:i A')?>" readonly>-->
                            <!--                <div class="input-group-text bg-primary border-primary text-white">-->
                            <!--                    <i class="ri-calendar-2-line"></i>-->
                            <!--                </div>-->
                            <!--            </div>-->
                            <!--        </div>-->
                                    <!--end col-->
                            <!--    </div>-->
                                <!--end row-->
                            <!--</form>-->
                            <form action="javascript:void(0);">
                                <div class="row g-3 mb-0 align-items-center">
                                    <div class="col-sm-auto">
                                        <div class="input-group">
                                            <input type="text" id="liveClock" class="form-control border-0 dash-filter-picker shadow" data-provider="flatpickr" data-range-date="true" data-date-format="d M, Y" readonly>
                                            <div class="input-group-text bg-primary border-primary text-white">
                                                <i class="ri-calendar-2-line"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <!--end col-->
                                </div>
                                <!--end row-->
                            </form>
                            <script>
                                document.addEventListener("DOMContentLoaded", function() {
                                    function updateClock() {
                                        const now = new Date();
                                        const formattedDate = now.toLocaleString('en-US', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: 'numeric',
                                            minute: 'numeric',
                                            hour12: true
                                        }).replace(',', '');
                                        
                                        document.getElementById('liveClock').value = formattedDate;
                                    }
                                
                                    updateClock(); // Initial call to set the clock immediately
                                    setInterval(updateClock, 60000); // Update the clock every minute
                                });


                            </script>
                        </div>
                    </div><!-- end card header -->
                </div>
                <!--end col-->
            </div>
            <!--end row-->
            <div class="row">
                
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <div class="widget-stat card bg-warning">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-user-circle text-success" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-white">
                                    <p class="mb-1 text-white">New Students</p>
                                    <h3 class="text-white">360</h3>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                
                
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <div class="widget-stat card bg-info hover-card" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-user-circle text-info" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-white">
                                    <p class="mb-1 text-white">Discontinued Students</p>
                                    <h3 class="text-white"><span class="counter-value" data-target="<?= $discontinued_students ?>">0</span></h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <?php if(is_admin() || is_institutions()) { ?>
                    <div class="col-xxl-3 col-xl-3 col-sm-6">
                        <div class="widget-stat card bg-secondary hover-card" style="cursor: pointer;">
                            <div class="card-body">
                                <div class="media d-flex my-2">
                                    <span class="me-3">
                                        <div class="icon-container">
                                            <i class="bx bxs-book-open text-secondary" style="font-size: 2rem;"></i>
                                        </div>
                                    </span>
                                    <div class="media-body text-white">
                                        <p class="mb-1 text-white">Courses</p>
                                        <h3 class="text-white"><span class="counter-value" data-target="<?= $course_count ?>">0</span></h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php } ?>

                
            </div>
            <hr>
            
            <br>
            
            <div class="row">
                <!-- STUDENTS Card -->
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <a href="<?= base_url('app/students/index/') ?>" class="widget-stat card bg-primary hover-card" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-folder-open text-info" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-white">
                                    <p class="mb-1 text-white">STUDENTS</p>
                                    <span class="text-white fs-12">VIEW ALL STUDENTS</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            
                <!-- FOLLOWUPS Card -->
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <a href="<?= base_url('app/followups/index/') ?>" class="widget-stat card bg-success hover-card" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-folder-open text-info" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-white">
                                    <p class="mb-1 text-white">FOLLOWUPS</p>
                                    <span class="text-white fs-12">VIEW ALL FOLLOWUPS</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            
                <?php if (is_admin()) { ?>
                <!-- TELECALLERS Card -->
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <a href="<?= base_url('app/telecallers/index') ?>" class="widget-stat card bg-warning hover-card" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-headphone text-dark" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-dark">
                                    <p class="mb-1">TELECALLERS</p>
                                    <span class="text-white fs-12">VIEW ALL TELECALLERS</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            
                <!-- INDIVIDUALS Card -->
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <a href="<?= base_url('app/teachers/index/') ?>" class="widget-stat card bg-info hover-card" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-folder-open text-info" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-white">
                                    <p class="mb-1 text-white">INDIVIDUALS</p>
                                    <span class="text-white fs-12">VIEW ALL INDIVIDUALS</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
                <?php } ?>
            
                <!-- CONSULTANT REPORT Card -->
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <a href="<?= base_url('app/lead_report/index/') ?>" class="widget-stat card bg-danger hover-card" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-folder-open text-info" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-white">
                                    <p class="mb-1 text-white">CONSULTANT REPORT</p>
                                    <span class="text-white fs-12">VIEW CONSULTANT REPORT</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            
                <!-- STUDENT REPORT Card -->
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <a href="<?= base_url('app/income_report/index/') ?>" class="widget-stat card bg-dark hover-card" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-folder-open text-info" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-white">
                                    <p class="mb-1 text-white">STUDENT REPORT</p>
                                    <span class="text-white fs-12">VIEW STUDENT REPORT</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            
                <!-- FOLLOW UP REPORT Card -->
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <a href="<?= base_url('app/followup_report/index/') ?>" class="widget-stat card bg-primary hover-card" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-folder-open text-info" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-white">
                                    <p class="mb-1 text-white">FOLLOW UP REPORT</p>
                                    <span class="text-white fs-12">VIEW FOLLOW UP REPORT</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            
                <?php if(is_admin()) { ?>
                <!-- INVOICE Card -->
                <div class="col-xxl-3 col-xl-3 col-sm-6">
                    <a href="<?= base_url('app/invoice/index/') ?>" class="widget-stat card bg-info hover-card" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="media d-flex my-2">
                                <span class="me-3">
                                    <div class="icon-container">
                                        <i class="bx bx-folder-open text-info" style="font-size: 2rem;"></i>
                                    </div>
                                </span>
                                <div class="media-body text-white">
                                    <p class="mb-1 text-white">INVOICE</p>
                                    <span class="text-white fs-12">VIEW INVOICES</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
                <?php } ?>
            </div>



        </div> <!-- end .h-100-->
    </div> <!-- end col -->
</div>
<div class="row">
    <div class="col-xl-4">
        <div class="card card-height-100">
            <div class="card-header align-items-center d-flex">
                <h4 class="card-title mb-0 flex-grow-1">Consultant by Status</h4>
            </div><!-- end card header -->
            <div class="card-body">
                <div id="new_chart_id" data-colors='["--vz-success", "--vz-info", "--vz-danger"]' class="apex-charts" dir="ltr"></div>
    
                <div class="table-responsive mt-3">
                    <table class="table table-borderless table-sm table-centered align-middle table-nowrap mb-0">
                        <tbody class="border-0">
                        <tr>
                            <td>
                                <h4 class="text-truncate fs-14 fs-medium mb-0"><i class="ri-stop-fill align-middle fs-18 text-info me-2"></i>Consultant</h4>
                            </td>
                            <td class="text-end">
                                <p class="text-muted mb-0"><i data-feather="users" class="me-2 icon-sm"></i><?=$leads?></p>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h4 class="text-truncate fs-14 fs-medium mb-0"><i class="ri-stop-fill align-middle fs-18 text-success me-2"></i>Active Students</h4>
                            </td>
                            <td class="text-end">
                                <p class="text-muted mb-0"><i data-feather="users" class="me-2 icon-sm"></i><?=$active_students?></p>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h4 class="text-truncate fs-14 fs-medium mb-0"><i class="ri-stop-fill align-middle fs-18 text-danger me-2"></i>Discontinued Students</h4>
                            </td>
                            <td class="text-end">
                                <p class="text-muted mb-0"><i data-feather="users" class="me-2 icon-sm"></i><?=$discontinued_students?></p>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div><!-- end card body -->
        </div><!-- end card -->
    </div><!-- end col -->

    <div class="col-xl-4">
        <div class="card card-height-100">
            <div class="card-header align-items-center d-flex">
                <h4 class="card-title mb-0 flex-grow-1">Consultant by lead source</h4>
            </div>

            <div class="card-body">

                <div class="row align-items-center">
                    <div class="col-6">
                        <h6 class="text-muted text-uppercase fw-semibold text-truncate fs-12 mb-3">Total Consultant Count</h6>
                        <h4 class="mb-0">0</h4>
                        <p class="mb-0 mt-2 text-muted"><span class="badge bg-success-subtle text-success mb-0"> <i class="ri-arrow-up-line align-middle"></i> 0 % </span> vs. previous month</p>
                    </div><!-- end col -->
                    <div class="col-6">
                        <div class="text-center">
                            <img src="assets/images/illustrator-1.png" class="img-fluid" alt="">
                        </div>
                    </div><!-- end col -->
                </div><!-- end row -->
                <div class="mt-3 pt-2">
                    <div class="progress progress-lg rounded-pill">
                        <div class="progress-bar bg-primary" role="progressbar" style="width: 25%" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="progress-bar bg-info" role="progressbar" style="width: 18%" aria-valuenow="18" aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="progress-bar bg-success" role="progressbar" style="width: 22%" aria-valuenow="22" aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="progress-bar bg-warning" role="progressbar" style="width: 16%" aria-valuenow="16" aria-valuemin="0" aria-valuemax="100"></div>
                        <div class="progress-bar bg-danger" role="progressbar" style="width: 19%" aria-valuenow="19" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div><!-- end -->

                <div class="mt-3 pt-2">
                    <div class="d-flex mb-2">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-primary me-2"></i>Google </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">0%</p>
                        </div>
                    </div><!-- end -->
                    <div class="d-flex mb-2">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-info me-2"></i>Facebook </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">0%</p>
                        </div>
                    </div><!-- end -->
                    <div class="d-flex mb-2">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-success me-2"></i>Instagram </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">0%</p>
                        </div>
                    </div><!-- end -->
                    <div class="d-flex mb-2">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-warning me-2"></i>Linekdln </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">0%</p>
                        </div>
                    </div><!-- end -->
                    <div class="d-flex">
                        <div class="flex-grow-1">
                            <p class="text-truncate text-muted fs-14 mb-0"><i class="mdi mdi-circle align-middle text-danger me-2"></i>Others </p>
                        </div>
                        <div class="flex-shrink-0">
                            <p class="mb-0">0%</p>
                        </div>
                    </div><!-- end -->
                </div><!-- end -->

                <div class="mt-2 text-center">
                    <a href="<?=base_url('app/lead_source/index')?>" class="text-muted text-decoration-underline">Show All</a>
                </div>

            </div><!-- end card body -->
        </div><!-- end card -->
    </div>
    <div class="col-xl-4">
        <div class="card card-height-100">
            <div class="card-header align-items-center d-flex">
                <h4 class="card-title mb-0 flex-grow-1">Lead Conversion - Monthly</h4>
            </div>
            <div class="card-body">
                <canvas id="leadConvertion" class="chartjs-chart"></canvas>

            </div>
        </div>
    </div> <!-- end col -->

</div><!-- end row -->


<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>


<script>
    document.addEventListener('DOMContentLoaded', function () {
        var options = {
            series: [<?= $leads ?>, <?= $active_students ?>, <?= $discontinued_students ?>],
            chart: {
                type: 'donut',
                height: 300
            },
            labels: ['Leads', 'Active Students', 'Discontinued Students'],
            colors: ['#17a2b8', '#28a745', '#dc3545'],
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%', // Adjust the overall size of the donut
                        width: '70%' // Adjust the thickness of the donut ring
                    }
                }
            },
            legend: {
                show: false
            }
        };

        var chart = new ApexCharts(document.querySelector("#new_chart_id"), options);
        chart.render();
    });
    
    // Sample data for Lead Conversion - Monthly
    const leadConversionData = {
      labels: ["January", "February", "March", "April", "May", "June","July","August","September","October","November","December"],
      datasets: [{
        label: 'Lead Conversion - Monthly',
        backgroundColor: '#405189',
        borderColor: '#405189',
        borderWidth: 1,
        data: [20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Replace with your data
      }]
    };

    // Get the canvas element
    const ctx = document.getElementById('leadConvertion').getContext('2d');

    // Create the bar chart
    const leadConvertion = new Chart(ctx, {
      type: 'bar',
      data: leadConversionData,
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
</script>

<style>
    .widget-stat{
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        transition: transform 0.3s ease, box-shadow 0.3s ease; 
    }
    .icon-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 70px; 
        height: 70px; 
        background-color: white;
        border-radius: 50%; 
    }
    
    .widget-stat:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2);
    }

</style>