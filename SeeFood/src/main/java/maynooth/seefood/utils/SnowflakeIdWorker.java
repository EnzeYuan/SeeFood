package maynooth.seefood.utils;

public class SnowflakeIdWorker {
    // 基准时间戳
    private final long twepoch = 1288834974657L;

    // 机器ID位数和最大值
    private final long workerIdBits = 5L;
    private final long maxWorkerId = -1L ^ (-1L << workerIdBits);

    // 数据中心ID位数和最大值
    private final long datacenterIdBits = 5L;
    private final long maxDatacenterId = -1L ^ (-1L << datacenterIdBits);

    // 序列号位数和最大值
    private final long sequenceBits = 12L;
    private final long sequenceMask = -1L ^ (-1L << sequenceBits);

    // 各部分左移位数
    private final long workerIdShift = sequenceBits;
    private final long datacenterIdShift = sequenceBits + workerIdBits;
    private final long timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;

    // 上次时间戳
    private long lastTimestamp = -1L;

    // 机器ID和数据中心ID
    private long workerId;
    private long datacenterId;

    // 序列号
    private long sequence = 0L;

    public SnowflakeIdWorker(long workerId, long datacenterId) {
        if (workerId > maxWorkerId || workerId < 0) {
            throw new IllegalArgumentException(String.format("worker Id can't be greater than %d or less than 0", maxWorkerId));
        }
        if (datacenterId > maxDatacenterId || datacenterId < 0) {
            throw new IllegalArgumentException(String.format("datacenter Id can't be greater than %d or less than 0", maxDatacenterId));
        }
        this.workerId = workerId;
        this.datacenterId = datacenterId;
    }

    public synchronized long nextId() {
        long timestamp = timeGen();
        if (timestamp < lastTimestamp) {
            System.err.printf("Clock moved backwards. Refusing to generate id for %d milliseconds", lastTimestamp - timestamp);
            throw new RuntimeException(String.format("Clock moved backwards. Refusing to generate id for %d milliseconds", lastTimestamp - timestamp));
        }

        if (lastTimestamp == timestamp) {
            sequence = (sequence + 1) & sequenceMask;
            if (sequence == 0) {
                timestamp = tilNextMillis(lastTimestamp);
            }
        } else {
            sequence = 0;
        }

        lastTimestamp = timestamp;
        return ((timestamp - twepoch) << timestampLeftShift) |
                (datacenterId << datacenterIdShift) |
                (workerId << workerIdShift) |
                sequence;
    }

    private long tilNextMillis(long lastTimestamp) {
        long timestamp = timeGen();
        while (timestamp <= lastTimestamp) {
            timestamp = timeGen();
        }
        return timestamp;
    }

    private long timeGen() {
        return System.currentTimeMillis();
    }

}
