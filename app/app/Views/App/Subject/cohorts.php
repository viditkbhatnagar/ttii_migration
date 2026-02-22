<div class="row">
    <?php if(!empty($cohorts)){ ?>
        <?php foreach($cohorts as $cohort){ ?>
            <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-4">
                <div class="card rounded-4 shadow-sm border-0 card-height-100 ">
                    <div class="card-header bg-primary text-white rounded-top-4 py-3">
                        <h5 class="card-title text-white mb-0 fw-bold"><?php echo htmlspecialchars($cohort['title']); ?></h5>
                        <small class="d-block opacity-75"><?php echo htmlspecialchars($cohort['cohort_id']); ?></small>
                    </div>
                    <div class="card-body mb-0">
                        <div class="mb-3">
                            <h6 class="text-muted small mb-1">Duration</h6>
                            <div class="d-flex align-items-center">
                                <i class="bi bi-calendar-event me-2 text-primary"></i>
                                <span><?php echo date('M j, Y', strtotime($cohort['start_date'])); ?> - <?php echo date('M j, Y', strtotime($cohort['end_date'])); ?></span>
                            </div>
                        </div>
                        <div>
                            <h6 class="text-muted small  ">Instructor</h6>
                            <div class="d-flex align-items-center">
                                <i class="bi bi-person-fill me-2 text-primary"></i>
                                <span><?php echo htmlspecialchars($cohort['instructor_name']); ?></span>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-0 rounded-bottom-4  ">
                        <a href="#" class="btn btn-outline-primary btn-sm rounded-3">View Details</a>
                    </div>
                </div>
            </div>  
        <?php } ?>
    <?php } else { ?>
        <div class="col-12">
            <div class="alert alert-info rounded-4">
                No cohorts found.
            </div>
        </div>
    <?php } ?>
</div>