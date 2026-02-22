<div class="row">
    <div class="col-12 col-md-4">
        <img src="<?= valid_file($events['image']) ? base_url(get_file($events['image'])) : ''  ?>" class="w-100">
        
                <!-- Instructor Information -->
        <div class="instructor-info mt-3">
            <h2>Instructor</h2>
            <div class="d-flex align-items-center">
                <img src="<?= $events['instructor']['profile_picture'] ?? '' ?>" alt="Instructor" class="rounded-circle me-3" style="width: 50px; height: 50px;">
                <p class="mb-0 fs-4"><?= $events['instructor']['name'] ?? '' ?></p>
            </div>
        </div>

    </div>
    <div class="col-12 col-md-8">
        <div class="w-100 d-flex align-items-center justify-content-end">
            <a href="<?= base_url('app/events/index') ?>" class="btn btn-primary rounded-pill">Back</a>
        </div>
        <h2 class="mt-3"><?= $events['title'] ?? '' ?></h2>
        <p class="fs-4"><?= $events['description'] ?? '' ?></p>
        
        <!-- Event Date and Time -->
        <div class="event-details mt-3">
            <h2>Event Details</h2>
            <p class="fs-4"><strong>Date:</strong> <?= date('F j, Y', strtotime($events['event_date'])) ?></p>
            <p class="fs-4"><strong>Time:</strong> <?= date('g:i A', strtotime($events['from_time'])) ?> to <?= date('g:i A', strtotime($events['to_time'])) ?></p>
            <p class="fs-4"><strong>Duration:</strong> <?= $events['duration'] ?></p>
        </div>


        <!-- Objectives -->
        <div class="objectives mt-3">
            <h2>Objectives</h2>
            <ul>
                <?php if (!empty($events['objectives'])): ?>
                    <?php foreach (json_decode($events['objectives']) as $objective): ?>
                        <li class="fs-4"><?= $objective ?></li>
                    <?php endforeach; ?>
                <?php else: ?>
                    <li class="fs-4">No objectives listed.</li>
                <?php endif; ?>
            </ul>
        </div>

        <!-- Recording Availability -->
        <div class="recording-availability mt-3">
            <h2>Recording</h2>
            <p class="fs-4"><?= $events['is_recording_available'] ? 'Recording will be available after the event.' : 'Recording will not be available.' ?></p>
        </div>
    </div>
</div>