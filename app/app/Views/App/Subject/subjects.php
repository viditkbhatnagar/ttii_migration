<style>
    .nav-primary .nav-link.active{
        background-color: #FB803D;
    }
</style>
<div class="card rounded-4">
    <div class="card-body">
        <div class="row">
            <div class="col-12 col-md-6 d-flex align-items-center justify-content-start">
                <a href="<?= base_url('app/subject/index/'.$subject['course_id']) ?>" class="d-flex align-items-center"><i class="ri-arrow-left-s-line fs-3"></i> <h4 class="mb-0"><?= $subject['title'] ?></h4></a>
                
            </div>
            <div class="col-12 col-md-6 d-flex align-items-center justify-content-end">
                <ul class="nav nav-pills nav-primary" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" data-bs-toggle="tab" href="#lessons" role="tab" aria-selected="false" tabindex="-1">
                            Lessons
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link " data-bs-toggle="tab" href="#cohorts" role="tab" aria-selected="true">
                            Cohorts
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" data-bs-toggle="tab" href="#liveclass" role="tab" aria-selected="false" tabindex="-1">
                            Live class
                        </a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" data-bs-toggle="tab" href="#assignments" role="tab" aria-selected="false" tabindex="-1">
                            Assignments
                        </a>
                    </li>
                </ul>
            </div>
        </div>
        
    </div>
</div>
<div class="tab-content  text-muted">
    <div class="tab-pane active" id="lessons" role="tabpanel">
        <?php include('lessons.php'); ?>
    </div>

    <div class="tab-pane" id="cohorts" role="tabpanel">
        <?php include('cohorts.php'); ?>
    </div>
    <div class="tab-pane" id="liveclass" role="tabpanel">
        <!-- Tab Navigation -->
        <?php if(!empty($live_classes)){ ?>
        <ul class="nav nav-tabs mb-4" id="liveClassesTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link mynavlink active" id="upcoming-tab" data-bs-toggle="tab" data-bs-target="#upcoming" type="button" role="tab">Upcoming</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link mynavlink" id="today-tab" data-bs-toggle="tab" data-bs-target="#today" type="button" role="tab">Today</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link mynavlink" id="past-tab" data-bs-toggle="tab" data-bs-target="#past" type="button" role="tab">Past</button>
            </li>
        </ul>
        
        <!-- Tab Content -->
        <div class="tab-content" id="liveClassesTabContent">
            <?php
            // Categorize live classes
            $today = date('Y-m-d');
            $upcoming = [];
            $todayClasses = [];
            $past = [];
            
            foreach($live_classes as $class) {
                if ($class['is_repetitive'] == 1) {
                    $repeat_dates = json_decode($class['repeat_dates'] ?? '[]', true);
                    foreach($repeat_dates as $rdate) {
                        $tempClass = $class;
                        $tempClass['date'] = $rdate;
                        if ($rdate > $today) {
                            $upcoming[] = $tempClass;
                        } elseif ($rdate == $today) {
                            $todayClasses[] = $tempClass;
                        } else {
                            $past[] = $tempClass;
                        }
                    }
                }
                
                if ($class['date'] > $today) {
                    $upcoming[] = $class;
                } elseif ($class['date'] == $today) {
                    $todayClasses[] = $class;
                } else {
                    $past[] = $class;
                }
            }
            ?>
            
            <!-- Upcoming Classes Tab -->
            <div class="tab-pane fade show active" id="upcoming" role="tabpanel">
                <div class="row">
                    <?php if(!empty($upcoming)): ?>
                        <?php foreach($upcoming as $class): ?>
                            <div class="col-12 col-md-6 col-lg-4 mb-4">
                                <div class="card border-start  ">
                                    <div class="card-header bg-primary bg-opacity-10 d-flex justify-content-between align-items-center">
                                        <h5 class="card-title text-white mb-0 fw-bold"><?= htmlspecialchars($class['title']) ?></h5>
                                        <span class="badge bg-primary">Upcoming</span>
                                    </div>
                                    <div class="card-body">
                                        <div class="mb-3">
                                            <h6 class="text-muted small mb-1">Session ID</h6>
                                            <p class="mb-0"><?= htmlspecialchars($class['session_id']) ?></p>
                                        </div>
                                        <div class="mb-3">
                                            <h6 class="text-muted small mb-1">Date</h6>
                                            <p class="mb-0"><?= date('d/m/Y', strtotime($class['date'])) ?></p>
                                        </div>
                                        <div class="mb-3">
                                            <h6 class="text-muted small mb-1">Time</h6>
                                            <p class="mb-0">
                                                <?= date('h:i A', strtotime($class['fromTime'])) ?> - 
                                                <?= date('h:i A', strtotime($class['toTime'])) ?>
                                            </p>
                                        </div>
                                        <?php if($class['is_repetitive'] == 1): ?>
                                            <div class="mb-3">
                                                <h6 class="text-muted small mb-1">Repeat Dates</h6>
                                                <div class="d-flex flex-wrap gap-1">
                                                    <?php 
                                                    $dates = json_decode($class['repeat_dates'] ?? '[]', true);
                                                    foreach($dates as $rdate): 
                                                    ?>
                                                        <span class="badge bg-light text-dark"><?= date('d/m/Y', strtotime($rdate)) ?></span>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                    <div class="card-footer bg-transparent">
                                        <button class="btn btn-sm btn-primary">Join Session</button>
                                        <button class="btn btn-sm btn-outline-secondary">Details</button>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="col-12">
                            <div class="alert alert-info">No upcoming live classes found.</div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- Today's Classes Tab -->
            <div class="tab-pane fade" id="today" role="tabpanel">
                <div class="row">
                    <?php if(!empty($todayClasses)): ?>
                        <?php foreach($todayClasses as $class): ?>
                            <div class="col-12 col-md-6 col-lg-4 mb-4">
                                <div class="card border-start border-4 border-warning ">
                                    <div class="card-header bg-warning bg-opacity-10 d-flex justify-content-between align-items-center">
                                        <h5 class="card-title mb-0 fw-bold"><?= htmlspecialchars($class['title']) ?></h5>
                                        <span class="badge bg-warning text-dark">Today</span>
                                    </div>
                                    <div class="card-body">
                                        <div class="mb-3">
                                            <h6 class="text-muted small mb-1">Session ID</h6>
                                            <p class="mb-0"><?= htmlspecialchars($class['session_id']) ?></p>
                                        </div>
                                        <div class="mb-3">
                                            <h6 class="text-muted small mb-1">Time</h6>
                                            <p class="mb-0">
                                                <?= date('h:i A', strtotime($class['fromTime'])) ?> - 
                                                <?= date('h:i A', strtotime($class['toTime'])) ?>
                                            </p>
                                        </div>
                                        <?php if($class['is_repetitive'] == 1): ?>
                                            <div class="mb-3">
                                                <h6 class="text-muted small mb-1">Also repeats on</h6>
                                                <div class="d-flex flex-wrap gap-1">
                                                    <?php 
                                                    $dates = json_decode($class['repeat_dates'] ?? '[]', true);
                                                    foreach($dates as $rdate): 
                                                        if ($rdate != $today):
                                                    ?>
                                                        <span class="badge bg-light text-dark"><?= date('d/m/Y', strtotime($rdate)) ?></span>
                                                    <?php 
                                                        endif;
                                                    endforeach; 
                                                    ?>
                                                </div>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                    <div class="card-footer bg-transparent">
                                        <button class="btn btn-sm btn-warning">Join Now</button>
                                        <button class="btn btn-sm btn-outline-secondary">Details</button>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="col-12">
                            <div class="alert alert-info">No live classes scheduled for today.</div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- Past Classes Tab -->
            <div class="tab-pane fade" id="past" role="tabpanel">
                <div class="row">
                    <?php if(!empty($past)): ?>
                        <?php foreach($past as $class): ?>
                            <div class="col-12 col-md-6 col-lg-4 mb-4">
                                <div class="card border-start border-4 border-secondary ">
                                    <div class="card-header bg-secondary bg-opacity-10 d-flex justify-content-between align-items-center">
                                        <h5 class="card-title mb-0 fw-bold"><?= htmlspecialchars($class['title']) ?></h5>
                                        <span class="badge bg-secondary">Completed</span>
                                    </div>
                                    <div class="card-body">
                                        <div class="mb-3">
                                            <h6 class="text-muted small mb-1">Session ID</h6>
                                            <p class="mb-0"><?= htmlspecialchars($class['session_id']) ?></p>
                                        </div>
                                        <div class="mb-3">
                                            <h6 class="text-muted small mb-1">Date</h6>
                                            <p class="mb-0"><?= date('d/m/Y', strtotime($class['date'])) ?></p>
                                        </div>
                                        <div class="mb-3">
                                            <h6 class="text-muted small mb-1">Time</h6>
                                            <p class="mb-0">
                                                <?= date('h:i A', strtotime($class['fromTime'])) ?> - 
                                                <?= date('h:i A', strtotime($class['toTime'])) ?>
                                            </p>
                                        </div>
                                        <?php if($class['is_repetitive'] == 1): ?>
                                            <div class="mb-3">
                                                <h6 class="text-muted small mb-1">All Occurrences</h6>
                                                <div class="d-flex flex-wrap gap-1">
                                                    <?php 
                                                    $dates = json_decode($class['repeat_dates'] ?? '[]', true);
                                                    foreach($dates as $rdate): 
                                                    ?>
                                                        <span class="badge bg-light text-dark"><?= date('d/m/Y', strtotime($rdate)) ?></span>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                    <div class="card-footer bg-transparent">
                                        <button class="btn btn-sm btn-outline-secondary">View Recording</button>
                                        <button class="btn btn-sm btn-outline-dark">Details</button>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="col-12">
                            <div class="alert alert-info">No past live classes found.</div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php } else {?>
        <div class="alert alert-info">No live classes found.</div>
        <?php } ?>
    </div>
    <div class="tab-pane" id="assignments" role="tabpanel">
        <style>
            .mynavlink.active{
                background-color: #FB803D !important;
                border-radius: 45px;
            }
        </style>
 
</div>

