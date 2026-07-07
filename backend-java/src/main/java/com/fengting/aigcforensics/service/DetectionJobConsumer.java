package com.fengting.aigcforensics.service;

import java.util.Optional;

public interface DetectionJobConsumer {

    Optional<DetectionJobMessage> poll();

    void acknowledge(DetectionJobMessage message);
}
