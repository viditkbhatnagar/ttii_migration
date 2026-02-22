<!-- Layout config Js -->
<script src="https://trogon.info/codeace/html/src/assets/js/layout.js"></script>
<!-- Bootstrap Css -->
<link href="https://trogon.info/codeace/html/src/assets/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
<!-- Icons Css -->
<link href="https://trogon.info/codeace/html/src/assets/css/icons.min.css" rel="stylesheet" type="text/css" />
<!-- App Css-->
<link href="https://trogon.info/codeace/html/src/assets/css/app.min.css" rel="stylesheet" type="text/css" />
<!-- custom Css-->
<link href="https://trogon.info/codeace/html/src/assets/css/custom.min.css" rel="stylesheet" type="text/css" />



<style>

    .custom-nav .progress-label {
        font-size: 14px; /* Adjust font size */
        color: #6c757d; /* Optional: Customize label color */
        font-weight: 500; /* Optional: Add some weight to the labels */
    }
    .modern-nav-tabs {
    background: #e5e8ebff;
    border-radius: 15px;
    padding: 6px 10px;
    display: inline-flex;
    gap: 6px;
    }

    .modern-nav-tabs .nav-item {
    flex: 0 0 auto;
    }

    .modern-nav-tabs .nav-link {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    gap: 6px;
    font-weight: 500;
    color: #6c757d;
    border-radius: 10px;
    padding: 6px 16px;
    transition: all 0.25s ease;
    background: transparent;
    border: none;
    }

    .modern-nav-tabs .nav-link span {
    font-size: 0.9rem;
    }

    .modern-nav-tabs .nav-link.active {
    background-color: #0d6efd;
    color: #fff;
    box-shadow: 0 2px 6px rgba(13, 110, 253, 0.3);
    }

    .modern-nav-tabs .nav-link:hover {
    background-color: #e9ecef;
    color: #0d6efd;
    }

    .nav
    button.btn{
        min-width: 80px;
    }
    /* Custom CSS to prevent color change on accordion header */
    .accordion-button {
        background-color: #fff; /* Set the background color */
        color: #000; /* Set the text color */
    }
    .accordion-button:not(.collapsed) {
        background-color: #fff; /* Keep the background color when expanded */
        color: #000; /* Keep the text color when expanded */
    }
    .accordion-button:focus {
        box-shadow: none; /* Remove the focus shadow */
    }
    .accordion-button:hover {
        background-color: #fff; /* Keep the background color on hover */
        color: #000; /* Keep the text color on hover */
    }
    /* Custom CSS for the accordion icon */
    .accordion-button .accordion-icon {
        margin-left: auto; /* Align the icon to the right */
        font-size: 1.5rem; /* Increase the icon size */
        color: #007bff; /* Highlight the icon color */
    }

    .accordion-button:not(.collapsed) .accordion-icon i {
        transform: rotate(180deg); /* Rotate the icon when expanded */
    }
    .btn-label.right {
        padding-left: 1px;
         padding-right: 1px; 
    }


    #learnersTable .border-bottom:last-child {
    border: none !important;
    }
    #learnersTable img {
    object-fit: cover;
    }
    #learnersTable .d-flex:hover {
    background-color: #e0dedeff;
    }

    
</style>

<script>
    $(document).ready(function () {
    
        $('.select2').select2({
        
        });
    });
</script>

<!-- Start page title -->
<div class="row mb-3">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('centre/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item"><a href="<?=base_url('centre/cohorts/index')?>">Cohort</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>
        </div>
    </div>
</div>
<!-- end page title -->



<div class="row" id="cohortEdit">
    <div class="col-xl-12">
        <div class="card">
            <div class="card-header bg-light shadow border-dark ">
                <h2 class="card-title mb-0 text-primary"><?= $edit_data['title'] ?? '' ?></h2>
                    <div class="row">
                        <div class="col-8 ">
                            <span class="card-title mb-0 text-muted">Cohorts/<?= $edit_data['title'] ?? '' ?></span>
                        </div>
                        <?php if (has_permission('cohorts/add')) { ?>
                            <div class="col-4 d-none">
                                <a href="<?= base_url('centre/cohorts/cohort_add/') ?>" class="btn btn-md btn-primary float-end">
                                    <i class="mdi mdi-plus"></i>
                                    Add Cohort
                                </a>
                            </div>
                        <?php } ?>
                    </div>
                
            </div><!-- end card header -->
        

        </div>

                <div class="card">
                    <div class="card-body">

                        <div class="card mb-3 border-0 shadow-sm" style="background-color:#f4f9ff; border-radius:1rem;">
                            <div class="row g-0 align-items-center">

                                <!-- Left: Profile -->
                                <div class="col-md-3 text-center p-3">
                                <img src="<?= !empty($view_data['instructor_image']) ? base_url(get_file($view_data['instructor_image'])) : base_url('assets/admin/images/place-holder/profile-place-holder.jpg') ?>"
                                    alt="Instructor"
                                    class="rounded-circle img-fluid"
                                    style="width:80px; height:80px; object-fit:cover;">

                                <div class="mt-2">
                                    <small class="text-muted d-block">Faculty</small>
                                    <h6 class="fw-bold text-primary mb-0"><?= esc($view_data['instructor_name'] ?? 'Instructor') ?></h6>
                                    <small class="fw-bold text-secondary mb-0"><span class="text-muted">Course: </span><?= esc($view_data['course_name'] ?? '')?> <br>
                                        <span class="text-muted">Subject: </span><?=esc($view_data['subject_name'] ?? 'Subject').' - '.esc($view_data['language_name'] ?? 'Language') ?>
                                    </small>
                                </div>
                                </div>

                                <!-- Middle: Details -->
                                <div class="col-md-7">
                                <div class="row text-center py-3">
                                    <div class="col">
                                    <small class="text-muted d-block">No of Students</small>
                                    <h6 class="fw-semibold mb-0"><?= esc(count($students) ?? '0') ?></h6>
                                    </div>
                                    <div class="col">
                                    <small class="text-muted d-block">Total Live Sessions</small>
                                    <h6 class="fw-semibold mb-0"><?= esc(count($live_class) ?? '0') ?></h6>
                                    </div>
                                    <div class="col">
                                    <small class="text-muted d-block">Total Assignments</small>
                                    <h6 class="fw-semibold mb-0"><?= esc($assignments_count ?? '0') ?></h6>
                                    </div>
                                    <div class="col">
                                    <small class="text-muted d-block">Cohort ID</small>
                                    <h6 class="fw-semibold mb-0"><?= esc($edit_data['cohort_id'] ?? '—') ?></h6>
                                    </div>
                                    <div class="col">
                                    <small class="text-muted d-block">Start Date</small>
                                    <h6 class="fw-semibold mb-0"><?= esc($edit_data['start_date'] ?? '-') ?></h6>
                                    </div>
                                    <div class="col">
                                    <small class="text-muted d-block">End Date</small>
                                    <h6 class="fw-semibold mb-0"><?= esc($edit_data['end_date'] ?? '-') ?></h6>
                                    </div>
                                </div>
                                </div>

                                <!-- Right: Status -->
                                <div class="col-md-2 text-center">
                                    <span class="badge rounded-pill bg-success px-3 py-2 fs-6">
                                        <?= $edit_data['end_date'] < date('Y-m-d') ? 'Completed' : 'Active' ?>
                                    </span>
                                </div>

                                <!-- Right: Status -->
                                <!-- <div class="col-md-2 text-center">
                                    <div class="row text-center py-3">
                                        <div class="col">
                                        <small class="text-muted d-block">No of Students</small>
                                        <h6 class="fw-semibold mb-0"><?= esc($view_data['students_count'] ?? '0') ?></h6>
                                        </div>
                                        <div class="col">
                                        <small class="text-muted d-block">Total Live Sessions</small>
                                        <h6 class="fw-semibold mb-0"><?= esc($view_data['live_sessions_count'] ?? '0') ?></h6>
                                        </div>
                                        <div class="col">
                                        <small class="text-muted d-block">Total Assignments</small>
                                        <h6 class="fw-semibold mb-0"><?= esc($view_data['assignments_count'] ?? '0') ?></h6>
                                        </div>
                                    </div>
                                    <div class="row text-center py-3">
                                        <div class="col">
                                        <small class="text-muted d-block">Room ID</small>
                                        <h6 class="fw-semibold mb-0">#<?= esc($view_data['room_id'] ?? '—') ?></h6>
                                        </div>
                                        <div class="col">
                                        <small class="text-muted d-block">Start Date</small>
                                        <h6 class="fw-semibold mb-0"><?= esc($view_data['start_date'] ?? '-') ?></h6>
                                        </div>
                                        <div class="col">
                                        <small class="text-muted d-block">End Date</small>
                                        <h6 class="fw-semibold mb-0"><?= esc($view_data['end_date'] ?? '-') ?></h6>
                                        </div>
                                    </div>
                                    <div class="row text-center py-3">
                                        <div class="col">
                                            <span class="badge rounded-pill bg-success px-3 py-2 fs-6">
                                                <?= esc($view_data['status'] ?? 'Active') ?>
                                            </span>
                                        </div>
                                    </div>
                                </div> -->

                            </div>
                            </div>

                        <div class="nav-tabs-container text-center my-4">
                            <ul class="nav nav-pills justify-content-center align-items-center modern-nav-tabs" role="tablist">
                                <li class="nav-item d-none" role="presentation">
                                    <button class="nav-link active" id="pills-basic-info-tab" data-bs-toggle="pill" data-bs-target="#pills-basic-info" type="button" role="tab" >
                                    1 <span>Basic Info</span>
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="pills-learners-info-tab" data-bs-toggle="pill" data-bs-target="#pills-learners-info" type="button" role="tab" aria-controls="pills-learners-info" aria-selected="true">
                                     <span>Learners</span>
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="pills-live-sessions-info-tab" data-bs-toggle="pill" data-bs-target="#pills-live-sessions-info" type="button" role="tab">
                                     <span>Live Sessions</span>
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="pills-activities-info-tab" data-bs-toggle="pill" data-bs-target="#pills-activities-info" type="button" role="tab">
                                     <span>Activities/Assignments</span>
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="pills-announcements-info-tab" data-bs-toggle="pill" data-bs-target="#pills-announcements-info" type="button" role="tab">
                                     <span>Announcements</span>
                                    </button>
                                </li>
                            </ul>
                        </div>


                        <div class="tab-content">
                        

                            <div class="tab-pane fade show active d-none" id="pills-basic-info" role="tabpanel" aria-labelledby="pills-basic-info-tab">
                                    <h4>Basic Info</h4>
                                    <?= $this->include('Centre/Cohorts/ajax_add');?>
                        
                            </div>
                            <!-- end tab pane -->

                            <div class="tab-pane fade show active" id="pills-learners-info" role="tabpanel" aria-labelledby="pills-learners-info-tab">
                                <!-- <form action="</?= base_url('admin/Cohorts/add_cohort_students') ?>" id="addCohortLearnersForm"  method="post" enctype="multipart/form-data" class="</?php echo is_admin() ? '' : 'd-none'; ?>">
                                    
                                    <input type="hidden" id="cohort_id" name="cohort_id" value="</?= $edit_data['id'] ?>">
                                    
                                    <div class="col-lg-8">
                                        <div class="mb-3">
                                            <label class="form-label" for="student_ids">Choose Learners<span class="required text-danger">*</span></label>
                                            <select class="form-select select2 shadow-none" multiple   name="student_id[]" id="student_ids" required>
                                                <option value="" disabled>Select Learners</option>
                                                </?php foreach ($learners as $learner): ?>
                                                    <option value="</?=$learner['user_id']?>">/?=$learner['name']?></option>
                                                </?php endforeach; ?>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="d-flex align-items-start gap-3 mt-4">
                                        <button type="button" id="learnersSubmitBtn" class="btn btn-success btn-label right ms-auto nexttab">Save</button>
                                    </div>
                                </form> -->
                                <!--table to view learners-->
                                <div class="card">
                                    <div class="card-body">
                                        <div class="row align-items-center justify-content-between mb-3">
                                            <div class="col-md-3">
                                                <h5 class="card-title">Learners List</h5>
                                                
                                                <button type="button" id="learnersSubmitBtn" class="btn btn-sm btn-primary rounded-pill float-start" onclick="show_ajax_modal('<?=base_url('centre/Cohorts/ajax_add_learner/'.$edit_data['subject_id'].'/'.$edit_data['id'])?>', 'Add Learner')">
                                                <i class="mdi mdi-plus"></i> Add</button>
                                                </button>
                                                
                                            </div>
                                            <div class="col-md-9 text-end float-end" style="right: 0; width: 20%;">
                                                <input type="search" class="form-control" id="studentSearch" placeholder="Search Learners" >
                                            </div>
                                        </div>
                                        

                                        <!-- Swiper -->
                                        <div class="row">
                                            <div class="col-lg-12">
                                                <div class="card border-0 shadow-sm" id="learnersTable">
                                                    <div class="card-body p-3">

                                                        <div class="row fw-semibold text-muted border-bottom pb-2 small">
                                                            <div class="col-6 col-md-4">No</div>
                                                            <!-- <div class="col-6 col-md-4">Classmates</div> -->
                                                        </div>
                                                        

                                                        <div class="row mt-2 small">
                                                            <?php 
                                                            if (!empty($students)): 
                                                                $chunks = array_chunk($students, ceil(count($students) / 3)); // Split into 3 columns
                                                                $count = 1;
                                                                foreach ($chunks as $chunk): ?>
                                                                    <div class="col-12 col-md-4 student-column">
                                                                        <?php foreach ($chunk as $student): ?>
                                                                            <div class="d-flex align-items-center py-1 border-bottom student-item">
                                                                                <span class="me-2 text-muted fs-12"><?= $count++ ?></span>
                                                                                <img src="<?= !empty($student['profile_picture']) ? base_url(get_file($student['profile_picture'])) : base_url('assets/admin/images/place-holder/profile-place-holder.jpg') ?>" 
                                                                                    class="rounded-circle me-2" width="40" height="40" alt="student">
                                                                                <span id="learnerName" class="student-name"><?= esc($student['name'] ?? 'Unknown') ?></span>

                                                                                <?php if (is_centre()): ?>
                                                                                    <a href="javascript:void(0)" 
                                                                                    class="ms-auto text-danger fs-15 learnersDeleteBtn" 
                                                                                    data-id="<?= $student['id'] ?>" 
                                                                                    data-cohort-id="<?= $student['cohort_id'] ?>"
                                                                                    data-bs-toggle="tooltip" 
                                                                                    title="Remove">
                                                                                        <i class="ri-delete-bin-line"></i>
                                                                                    </a>
                                                                                <?php endif; ?>
                                                                            </div>
                                                                        <?php endforeach; ?>
                                                                    </div>
                                                                <?php endforeach; 
                                                            endif;
                                                            ?>
                                                        </div>

                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                <!-- end card body -->
                                </div><!-- end card -->
                            </div>
                            <!-- end tab pane -->
                            
                            <div class="tab-pane fade" id="pills-live-sessions-info" role="tabpanel" aria-labelledby="pills-live-sessions-info-tab">
                            
                                <?= $this->include('Centre/Live_class/live_cohort_index'); ?>
                                
                            </div>
                            <!-- end tab pane -->

                            <div class="tab-pane fade" id="pills-activities-info" role="tabpanel" aria-labelledby="pills-activities-info-tab">
                                
                                <div id="assignmentsContainer"></div>
                                <!-- </?= $this->include('Admin/Assignment/cohort_assignments_index'); ?> -->
                                 <div class="text-center my-5 text-muted" id="activities-loader">
                                    <div class="spinner-border text-primary" role="status"></div>
                                    <p class="mt-2 small">Loading Activities...</p>
                                </div>

                            </div>
                            <!-- end tab pane -->
                            
                            <div class="tab-pane fade" id="pills-announcements-info" role="tabpanel" aria-labelledby="pills-announcements-info-tab">
                                
                                <div id="announcementsContainer"></div>
                                <!-- </?= $this->include('Admin/Announcement/cohort_announcement_index'); ?> -->
                                <div class="text-center my-5 text-muted" id="activities-loader">
                                    <div class="spinner-border text-primary" role="status"></div>
                                    <p class="mt-2 small">Loading Announcements...</p>
                                </div>
                            </div>
                            <!-- end tab pane -->
                        </div>
                    </div>
                </div>
            </div>
            <!-- end card body -->
        </div>
        <!-- end card -->
    </div>
    <!-- end col -->
</div>
<!-- end row -->


<script>
   
    $(document).ready(function () {

        // Activities
        
        $('#pills-activities-info-tab').on('shown.bs.tab', function () {
            let container = $('#assignmentsContainer');
            let loader = $('#activities-loader');

            if (!container.data('loaded')) {
                loader.show();

                container.load( "<?= base_url('centre/Cohorts/load_cohort_assignments/'.$edit_data['id']) ?>", function (response, status) { 
                    loader.hide();
                     if (status === "success") {
                         initAssignmentsScripts(); 
                        } else 
                        { container.html('<p class="text-danger mt-3">Failed to load assignments. Please try again.</p>'); 

                        } 
                    });

            }
        });


        // Announcements
        $('#pills-announcements-info-tab').on('shown.bs.tab', function () {
            let container = $('#pills-announcements-info');
            let loader = $('#announcements-loader');

            if (!container.data('loaded')) {
                loader.show();

                container.load(
                    "<?= base_url('centre/Cohorts/load_cohort_announcements/'.$edit_data['id']) ?>",
                    function (response, status) {
                        loader.hide();
                        if (status === "success") {
                            container.data('loaded', true);
                        } else {
                            container.html('<p class="text-danger mt-3">Failed to load announcements. Please try again.</p>');
                        }
                    }
                );
            }
        });


        


        // basic add
        $("#basicSubmitBtn").on("click", function (e) {
            e.preventDefault();
            
            var form = document.getElementById("addCohortBasicForm");
            
            var routeUrl = form.action
            
            ajax(form,routeUrl,$("#pills-learners-info-tab"));
            
        });
        
        // learners add
        $("#learnersSubmitBtn").on("click", function (e) {
            e.preventDefault();
           
            var form = document.getElementById("addCohortLearnersForm");
            
            var routeUrl = "<?=base_url('centre/Cohorts/add_cohort_students')?>";
            
            var reload = "#learnersTable"
            
            ajax(form,routeUrl,$("#pills-live-sessions-info-tab"),reload);
            
        });
        
        // learners delete
        $(document).on("click", ".learnersDeleteBtn", function (e) {
            e.preventDefault();
           
            const id = $(this).data("id");
            const cohortId = $(this).data("cohort-id");
        
            Swal.fire({
                icon: "warning",
                title: "Are you sure?",
                text: "This action cannot be undone!",
                showCancelButton: true,
                confirmButtonText: "Yes, delete it!",
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: "<?= base_url('centre/cohorts/delete_cohort_student') ?>",
                        type: "POST",
                        data: {
                            id: id,
                            cohort_id: cohortId
                        },
                        dataType: "json",
                        success: function (response) {
                            if (response.success) {
                                Swal.fire({
                                    icon: "success",
                                    title: "Deleted!",
                                    text: response.message,
                                    timer: 2000,
                                    showConfirmButton: false
                                }).then(() => {
                                    $("#learnersTable").load(location.href + " #learnersTable > *");
                                    $("#learnersDropdown").load(location.href + " #learnersDropdown > *");
                                });
                            } else {
                                Swal.fire({
                                    icon: "error",
                                    title: "Error!",
                                    text: response.message || "Something went wrong!",
                                });
                            }
                        },
                        error: function () {
                            Swal.fire({
                                icon: "error",
                                title: "Error!",
                                text: "Failed to submit data. Please try again.",
                            });
                        }
                    });
                }
            });
            
        });

        // announcements add
        $("#announcementsSubmitBtn").on("click", function (e) {
            e.preventDefault();
            
            var form = document.getElementById("announcementsAddForm");
            
            var routeUrl = "<?=base_url('centre/Cohorts/add_cohort_announcements')?>";
            
            var navigate = "<?=base_url('centre/Cohorts/index')?>";
            
            ajax(form,routeUrl,navigate,navigate);
            
        });
        
        function ajax(form,routeUrl,triggerId,reload) {
            var formData = new FormData(form);
            $.ajax({
                url: routeUrl, 
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                dataType: "json",
                success: function (response) {
                    if (response.success) { 
                        Swal.fire({
                            icon: "success",
                            title: "Success!",
                            text: response.message,
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            form.reset(); 
                            $(form).find("select").val(null).trigger("change");
                            $(reload).load(location.href + " " + reload + " > *");
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: response.message || "Something went wrong!",
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text: "Failed to submit data. Please try again.",
                    });
                }
            });  
        }
        
        function resetForm() {
            $("#addCohortLearnersForm")[0].reset();
            $("#student_ids").val(null).trigger("change"); 
        }
    
    });
    
</script>
<script>
    document.addEventListener("DOMContentLoaded", function() {
        const searchInput = document.getElementById("studentSearch");
        const students = document.querySelectorAll(".student-item");

        searchInput.addEventListener("input", function() {
            const term = this.value.toLowerCase();

            students.forEach(student => {
                const name = student.querySelector(".student-name").textContent.toLowerCase();
                const match = name.includes(term);
                if (match) {
                student.classList.remove('d-none');
                } else {
                student.classList.add('d-none');
                }
            });
        });

        searchInput.addEventListener('search', function () {
            // Clear input (browser already does this)
            students.forEach(item => item.classList.remove('d-none')); // show all again
        });
    });
</script>
<script>
function initAssignmentsScripts() {
  // 1️Load assignment details
  $(document).off('click', '.assignment-item').on('click', '.assignment-item', function () {
    $('.assignment-item').removeClass('active');
    $(this).addClass('active');

    const assignmentId = $(this).data('id');

    $.ajax({
      url: '<?= base_url("centre/Cohorts/ajax_assignment_details") ?>',
      type: 'POST',
      data: { id: assignmentId },
      dataType: 'json',
      success: function (data) {
        $('#assignmentTitle').text(data.title);
        $('#assignmentMeta').text(`Cohort: ${data.cohort}`);
        $('#assignmentDeadline').html(`<strong>Deadline: ${data.due_date} (${data.to_time})</strong>`);
        $('#assignmentTotalMarks').html(`<strong>Total Marks: ${data.total_marks}</strong>`);
        $('#assignmentQuestion').html(`<strong>File: <a href="${data.file}" target="_blank">Download</a></strong>`);
        $('#assignmentDetails').html(`
          <h6 class="fw-semibold text-uppercase text-secondary mb-2">Instructions</h6>
          <div class="text-muted">${data.instructions}</div>
        `);
        $('#submissionContainer').html('Click on “Submissions” to load data.');
        $('#submissionContainer').removeData('loaded');
      }
    });
  });

  //  Tab switching
  $(document).off('click', '.nav-link[data-tab]').on('click', '.nav-link[data-tab]', function (e) {
    e.preventDefault();
    const tab = $(this).data('tab');
    $('.nav-link').removeClass('active');
    $(this).addClass('active');
    $('.tab-pane').removeClass('active');
    if (tab === 'details') $('#detailsTab').addClass('active');
    else $('#submissionsTab').addClass('active');
  });

  //  Load submissions


    $(document).off('click', '.nav-link[data-tab]').on('click', '.nav-link[data-tab]', function (e) {
    e.preventDefault();

    const assignmentId = $('.assignment-item.active').data('id');
    if (!assignmentId) return;
    const tab = $(this).data('tab');

    // Highlight the clicked tab
    $('.nav-link[data-tab]').removeClass('active');
    $(this).addClass('active');

    // Show relevant tab-pane
    if (tab === 'details') {
        $('#detailsTab').addClass('active').show();
        $('#submissionsTab').removeClass('active').hide();
        $('#unsubmissionsTab').removeClass('active').hide();
    } else if (tab === 'submissions') {
        $('#submissionsTab').addClass('active').show();
        $('#detailsTab').removeClass('active').hide();
        $('#unsubmissionsTab').removeClass('active').hide();
    } else if (tab === 'unsubmissions') {
        $('#unsubmissionsTab').addClass('active').show();
        $('#submissionsTab').removeClass('active').hide();
        $('#detailsTab').removeClass('active').hide();
    }

    $.ajax({
        url: '<?= base_url("centre/Cohorts/ajax_show_submissions") ?>',
        type: 'POST',
        data: { assignment_id: assignmentId },
        success: function (html) {
            $('#submissionContainer').html(html);
            $('#submissionContainer').data('loaded', true);
        },
        error: function () {
            $('#submissionContainer').html('<p class="text-danger">Failed to load submissions.</p>');
        }
        });

    $.ajax({
        url: '<?= base_url("centre/Cohorts/ajax_show_unsubmissions") ?>',
        type: 'POST',
        data: { assignment_id: assignmentId },
        success: function (html) {
            $('#unsubmissionContainer').html(html);
            $('#unsubmissionContainer').data('loaded', true);
        },
        error: function () {
            $('#unsubmissionContainer').html('<p class="text-danger">Failed to load submissions.</p>');
        }
        });

    });
}
</script>

